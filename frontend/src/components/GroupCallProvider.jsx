/**
 * GroupCallProvider.jsx
 * Full mesh WebRTC group voice/video calls.
 * Each participant creates a P2P connection to every other participant.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users, X, Maximize2, Minimize2 } from 'lucide-react'
import useStore from '../store/useStore'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
}

// Global state for group call
let groupCallState = null
const setGroupCallStateGlobal = (fn) => {
  if (typeof fn === 'function') {
    groupCallState = fn(groupCallState)
  } else {
    groupCallState = fn
  }
}

export default function GroupCallProvider({ children }) {
  const { socket, user } = useStore()
  const [callInfo, setCallInfo] = useState(null)         // { chatId, chatName, isVideo, callerId }
  const [isInCall, setIsInCall] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [peers, setPeers] = useState({})                 // { peerId: { stream, name, muted } }
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const peerConnections = useRef({})   // { peerId: RTCPeerConnection }
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)

  const myId = String(user?._id || user?.id || '')
  const myName = user?.name || 'You'

  // ── Cleanup ALL peers ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    Object.values(peerConnections.current).forEach(pc => {
      try { pc.close() } catch (_) {}
    })
    peerConnections.current = {}
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setPeers({})
    setIsInCall(false)
    setIsReceiving(false)
    setCallInfo(null)
    setIsMuted(false)
    setIsCamOff(false)
  }, [])

  // ── Create a peer connection to one remote user ───────────────────────────
  const createPeer = useCallback((peerId, stream, chatId, isInitiator) => {
    if (peerConnections.current[peerId]) {
      try { peerConnections.current[peerId].close() } catch (_) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnections.current[peerId] = pc

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // ICE candidates → send via socket
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('group_webrtc_signal', {
          to: peerId,
          chatId,
          signal: { type: 'candidate', candidate: e.candidate },
        })
      }
    }

    // Remote stream arrived
    pc.ontrack = (e) => {
      const remoteStream = e.streams[0]
      setPeers(prev => ({
        ...prev,
        [peerId]: { ...(prev[peerId] || {}), stream: remoteStream },
      }))
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setPeers(prev => {
          const next = { ...prev }
          delete next[peerId]
          return next
        })
        delete peerConnections.current[peerId]
      }
    }

    if (isInitiator) {
      // New joiner creates offer to existing peer
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket?.emit('group_webrtc_signal', {
            to: peerId,
            chatId,
            signal: { type: 'offer', sdp: pc.localDescription },
          })
        })
        .catch(console.error)
    }

    return pc
  }, [socket])

  // ── Get local media ───────────────────────────────────────────────────────
  const getLocalStream = useCallback(async (isVideo) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { width: 640, height: 480 } : false,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }, [])

  // ── Start a group call ────────────────────────────────────────────────────
  const startGroupCall = useCallback(async (chatId, chatName, isVideo) => {
    try {
      const stream = await getLocalStream(isVideo)
      socket?.emit('start_group_call', { chatId, isVideo, chatName })
      socket?.emit('join_group_call', { chatId })
      setCallInfo({ chatId, chatName, isVideo, callerId: myId })
      setIsInCall(true)
    } catch (err) {
      console.error('[GroupCall] Failed to start:', err)
      alert('Could not access camera/microphone. Please check permissions.')
    }
  }, [socket, myId, getLocalStream])

  // ── Join an existing group call ───────────────────────────────────────────
  const joinGroupCall = useCallback(async () => {
    if (!callInfo) return
    try {
      const stream = await getLocalStream(callInfo.isVideo)
      socket?.emit('join_group_call', { chatId: callInfo.chatId })
      setIsReceiving(false)
      setIsInCall(true)
    } catch (err) {
      console.error('[GroupCall] Failed to join:', err)
      alert('Could not access camera/microphone. Please check permissions.')
    }
  }, [socket, callInfo, getLocalStream])

  // ── Decline incoming call ─────────────────────────────────────────────────
  const declineGroupCall = useCallback(() => {
    setIsReceiving(false)
    setCallInfo(null)
  }, [])

  // ── Leave call ────────────────────────────────────────────────────────────
  const leaveGroupCall = useCallback(() => {
    if (callInfo) {
      socket?.emit('leave_group_call', { chatId: callInfo.chatId })
    }
    cleanup()
  }, [socket, callInfo, cleanup])

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(prev => !prev)
    }
  }, [])

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
      setIsCamOff(prev => !prev)
    }
  }, [])

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    // Someone else started a call in a group we're in
    const onGroupCallStarted = (data) => {
      if (data.callerId === myId) return   // ignore own
      setCallInfo({ ...data })
      setIsReceiving(true)
    }

    // Server sends us list of existing peers when we join
    const onGroupCallPeers = async ({ peers: peerIds, chatId }) => {
      if (!localStreamRef.current) return
      // Create offers to all existing peers
      peerIds.forEach(peerId => {
        setPeers(prev => ({ ...prev, [peerId]: { stream: null, name: peerId } }))
        createPeer(peerId, localStreamRef.current, chatId, true)
      })
    }

    // Mesh signals: offer / answer / candidate
    const onGroupWebrtcSignal = async ({ from, signal, chatId }) => {
      if (!localStreamRef.current) return

      if (signal.type === 'offer') {
        // We received an offer — create answer
        let pc = peerConnections.current[from]
        if (!pc) {
          pc = createPeer(from, localStreamRef.current, chatId, false)
          setPeers(prev => ({ ...prev, [from]: { ...(prev[from] || {}), stream: null } }))
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('group_webrtc_signal', {
          to: from,
          chatId,
          signal: { type: 'answer', sdp: pc.localDescription },
        })
      } else if (signal.type === 'answer') {
        const pc = peerConnections.current[from]
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      } else if (signal.type === 'candidate') {
        const pc = peerConnections.current[from]
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
          } catch (_) {}
        }
      }
    }

    const onUserLeftGroupCall = ({ userId }) => {
      if (peerConnections.current[userId]) {
        try { peerConnections.current[userId].close() } catch (_) {}
        delete peerConnections.current[userId]
      }
      setPeers(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }

    socket.on('group_call_started',    onGroupCallStarted)
    socket.on('group_call_peers',      onGroupCallPeers)
    socket.on('group_webrtc_signal',   onGroupWebrtcSignal)
    socket.on('user_left_group_call',  onUserLeftGroupCall)

    return () => {
      socket.off('group_call_started',   onGroupCallStarted)
      socket.off('group_call_peers',     onGroupCallPeers)
      socket.off('group_webrtc_signal',  onGroupWebrtcSignal)
      socket.off('user_left_group_call', onUserLeftGroupCall)
    }
  }, [socket, myId, createPeer])

  // Expose startGroupCall globally so ChatWindow can call it
  useEffect(() => {
    window.__linguaStartGroupCall = startGroupCall
    return () => { delete window.__linguaStartGroupCall }
  }, [startGroupCall])

  const peerList = Object.entries(peers)

  return (
    <>
      {children}

      <AnimatePresence>
        {/* ── Incoming group call banner ────────────────────────────────── */}
        {isReceiving && callInfo && !isInCall && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.8 }}
            style={{
              position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 99998, background: 'linear-gradient(135deg, rgba(20,25,45,0.95) 0%, rgba(10,15,30,0.95) 100%)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(76,116,249,0.3)', borderRadius: '24px',
              padding: '24px 32px', minWidth: '380px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(76,116,249,0.2), rgba(99,102,241,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(76,116,249,0.3)', boxShadow: '0 0 20px rgba(76,116,249,0.4)' }}>
                {callInfo.isVideo ? <Video size={26} color="#4C74F9" /> : <Phone size={26} color="#4C74F9" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '18px', fontFamily: 'Outfit,sans-serif', letterSpacing: '0.02em', marginBottom: '2px' }}>
                  Incoming Group {callInfo.isVideo ? 'Video' : 'Voice'} Call
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> {callInfo.chatName || 'Group Chat'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={declineGroupCall}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontFamily: 'Inter,sans-serif' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
              >
                <PhoneOff size={18} /> Decline
              </button>
              <button
                onClick={joinGroupCall}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(34,197,94,0.4)', fontFamily: 'Inter,sans-serif' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(34,197,94,0.5)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(34,197,94,0.4)' }}
              >
                <Phone size={18} /> Join Call
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Active group call UI ──────────────────────────────────────── */}
        {isInCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              ...(isMinimized
                ? { bottom: '24px', right: '24px', width: '320px', height: 'auto', borderRadius: '24px' }
                : { inset: 0, borderRadius: 0 }),
              zIndex: 9997,
              background: 'linear-gradient(135deg, rgba(8,12,24,0.95) 0%, rgba(15,22,40,0.95) 100%)',
              backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: isMinimized ? '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
              border: isMinimized ? '1px solid rgba(255,255,255,0.1)' : 'none'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMinimized ? '14px 20px' : '20px 32px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(76,116,249,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#4C74F9" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontFamily: 'Outfit,sans-serif', fontSize: isMinimized ? '15px' : '18px', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {callInfo?.chatName || 'Group Call'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
                    {peerList.length + 1} participant{(peerList.length + 1) !== 1 && 's'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsMinimized(prev => !prev)}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
            </div>

            {/* Video grid */}
            {!isMinimized && (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: peerList.length === 0 ? '1fr' : peerList.length <= 1 ? '1fr 1fr' : peerList.length <= 3 ? 'repeat(2,1fr)' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', padding: '16px', minHeight: 0, overflow: 'auto' }}>
                {/* Local video tile */}
                <div style={{ position: 'relative', background: 'rgba(0,0,0,0.5)', borderRadius: '24px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                  <video
                    ref={el => {
                      localVideoRef.current = el
                      // Vital fix: bind current stream to ref if it exists and isn't bound yet
                      if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                        el.srcObject = localStreamRef.current
                      }
                    }}
                    autoPlay muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: callInfo?.isVideo && !isCamOff ? 'block' : 'none', transform: 'scaleX(-1)' }}
                  />
                  {(!callInfo?.isVideo || isCamOff) && (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#4C74F9,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit,sans-serif', boxShadow: '0 8px 24px rgba(76,116,249,0.4)' }}>
                      {(myName || 'Y').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: '16px', left: '16px', color: '#fff', fontSize: '13px', fontWeight: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {isMuted && <MicOff size={14} color="#EF4444" />}
                    You
                  </div>
                </div>

                {/* Remote peer tiles */}
                {peerList.map(([peerId, peer]) => (
                  <div key={peerId} style={{ position: 'relative', background: 'rgba(0,0,0,0.5)', borderRadius: '24px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                    {peer.stream ? (
                      <video
                        autoPlay playsInline
                        ref={el => { if (el && peer.stream && el.srcObject !== peer.stream) el.srcObject = peer.stream }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit,sans-serif', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                        {(peer.name || peerId).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', color: '#fff', fontSize: '13px', fontWeight: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {peer.name || `Peer ${peerId.slice(-4)}`}
                    </div>
                  </div>
                ))}

                {/* Empty state when alone */}
                {peerList.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', gap: '16px', fontSize: '16px', fontWeight: 500 }}>
                    <Users size={56} strokeWidth={1} style={{ opacity: 0.5 }} />
                    Waiting for others to join...
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: isMinimized ? '16px' : '28px', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={toggleMute}
                style={{ width: '56px', height: '56px', borderRadius: '50%', background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', border: `1px solid ${isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)'}`, color: isMuted ? '#EF4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
                title={isMuted ? 'Unmute' : 'Mute'}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              {callInfo?.isVideo && (
                <button
                  onClick={toggleCamera}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: isCamOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', border: `1px solid ${isCamOff ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)'}`, color: isCamOff ? '#EF4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
                  title={isCamOff ? 'Turn On Camera' : 'Turn Off Camera'}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              )}
              <button
                onClick={leaveGroupCall}
                style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #EF4444, #DC2626)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.5)', transition: 'all 0.2s' }}
                title="Leave Call"
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <PhoneOff size={26} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
