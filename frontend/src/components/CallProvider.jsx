/**
 * CallProvider.jsx — Fixed receiver-side call display
 *
 * KEY FIXES:
 * 1. Receiver now shows active call UI immediately after answering (before ICE connects)
 *    by tracking a local `isAnswering` ref — no blank screen between accept and connect
 * 2. ICE candidate extraction fixed — server sends { type:'candidate', candidate:{...} }
 * 3. pendingIceRef cleared in createPeer to avoid cross-call contamination
 * 4. endCall stale closure fixed — reads callStartRef directly
 * 5. remoteSignalQueue drain happens ONCE per update, not twice
 * 6. doCleanup resets isAnswering too
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import useStore from '../store/useStore'
import { useCallStore } from '../store/useCallStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Lock } from 'lucide-react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
}

function createTonePlayer() {
  let ctx = null, timer = null
  const stop = () => {
    clearTimeout(timer)
    if (ctx) { try { ctx.close() } catch (_) { } ctx = null }
  }
  const play = (pattern) => {
    stop()
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      const loop = () => {
        if (!ctx) return
        pattern.forEach(({ freq1, freq2, dur, gap }, i) => {
          const t = ctx.currentTime + i * (dur + gap)
          const osc = ctx.createOscillator(), gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq1, t)
          if (freq2) osc.frequency.setValueAtTime(freq2, t + dur / 2)
          gain.gain.setValueAtTime(0.3, t)
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
          osc.start(t); osc.stop(t + dur)
        })
        const totalMs = pattern.reduce((s, p) => s + p.dur + p.gap, 0) * 1000 + 300
        timer = setTimeout(loop, totalMs)
      }
      loop()
    } catch (_) { }
  }
  return { play, stop }
}

const RING_PATTERN = [{ freq1: 440, freq2: 480, dur: .4, gap: .2 }, { freq1: 440, freq2: 480, dur: .4, gap: 1.0 }]
const CALLING_PATTERN = [{ freq1: 400, freq2: null, dur: .6, gap: 2.0 }]
const DECLINED_PATTERN = [{ freq1: 480, freq2: null, dur: .25, gap: .1 }, { freq1: 480, freq2: null, dur: .25, gap: .1 }, { freq1: 480, freq2: null, dur: .25, gap: .5 }]

const fmtDuration = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * Extract a valid RTCIceCandidateInit from whatever shape the server sends.
 * Server re-emits the full signal object: { type:'candidate', candidate: { candidate:'...', sdpMid:'...', sdpMLineIndex:N } }
 */
function extractCandidate(sig) {
  if (!sig) return null
  // Shape A (what our server sends): { type:'candidate', candidate:{ candidate:'...', sdpMid:'...', ... } }
  if (sig.type === 'candidate' && sig.candidate && typeof sig.candidate === 'object' && sig.candidate.candidate) {
    return sig.candidate
  }
  // Shape B (raw RTCIceCandidateInit): { candidate:'...', sdpMid:'...', sdpMLineIndex:N }
  if (sig.candidate && typeof sig.candidate === 'string') {
    return sig
  }
  return null
}

export default function CallProvider({ children }) {
  const { socket, user } = useStore()
  const {
    isReceivingCall, isCalling, activeCall, callMode, callerInfo,
    remoteStream, localStream,
    setLocalStream, setRemoteStream, setActiveCall, setPeerConnection,
    resetCall, clearAcceptedSignal, clearCallRejected, clearRemoteSignalQueue,
    pendingAcceptedSignal, remoteSignalQueue, callRejected, callEndedByRemote,
    logCall,
  } = useCallStore()

  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localVideoRef = useRef(null)
  const peerRef = useRef(null)
  const remotePeerIdRef = useRef(null)
  const pendingIceRef = useRef([])
  const isInitiatingRef = useRef(false)

  // KEY FIX: track receiver answering state locally so UI shows immediately
  // The receiver has isCalling=false and activeCall=false right after answerCall()
  // until ICE connects — without this the receiver sees a blank screen
  const [isAnswering, setIsAnswering] = useState(false)

  const callerTone = useRef(createTonePlayer())
  const receiverTone = useRef(createTonePlayer())

  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callTime, setCallTime] = useState(0)
  const [permError, setPermError] = useState('')
  const [showDeclined, setShowDeclined] = useState(false)

  const callTimerRef = useRef(null)
  const callStartRef = useRef(0)

  // Unlock AudioContext on first user gesture
  useEffect(() => {
    const unlock = () => {
      try { const ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume().then(() => ac.close()) } catch (_) { }
    }
    window.addEventListener('click', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { })
    }
  }, [])

  // Browser notification for incoming call
  useEffect(() => {
    if (!isReceivingCall || activeCall) return
    let notif = null
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        notif = new Notification(`📞 Incoming ${callMode === 'video' ? 'Video' : 'Voice'} Call`, {
          body: `${callerInfo?.name || 'Someone'} is calling you…`,
          icon: '/favicon.ico', tag: 'incoming-call', requireInteraction: true,
        })
        notif.onclick = () => { window.focus(); notif.close() }
      }
    } catch (_) { }
    return () => { try { notif?.close() } catch (_) { } }
  }, [isReceivingCall, activeCall, callMode, callerInfo])

  // Call timer — starts when activeCall becomes true
  useEffect(() => {
    if (activeCall) {
      setCallTime(0)
      callStartRef.current = Date.now()
      callTimerRef.current = setInterval(() => setCallTime(t => t + 1), 1000)
    } else {
      clearInterval(callTimerRef.current)
      setCallTime(0)
    }
    return () => clearInterval(callTimerRef.current)
  }, [activeCall])

  // Caller ringing tone
  useEffect(() => {
    if (isCalling && !activeCall) callerTone.current.play(CALLING_PATTERN)
    else callerTone.current.stop()
    return () => callerTone.current.stop()
  }, [isCalling, activeCall])

  // Receiver ring tone
  useEffect(() => {
    if (isReceivingCall && !activeCall) receiverTone.current.play(RING_PATTERN)
    else receiverTone.current.stop()
    return () => receiverTone.current.stop()
  }, [isReceivingCall, activeCall])

  // Attach remote stream to correct element
  useEffect(() => {
    if (!remoteStream) return
    const attach = () => {
      if (callMode === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
        remoteVideoRef.current.play().catch(() => { })
        return true
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.play().catch(() => { })
        return true
      }
      return false
    }
    if (!attach()) {
      let n = 0
      const iv = setInterval(() => { if (attach() || ++n >= 40) clearInterval(iv) }, 100)
      return () => clearInterval(iv)
    }
  }, [remoteStream, activeCall, isAnswering, callMode])

  // Attach local video stream
  useEffect(() => {
    if (!localStream) return
    const attach = () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
        localVideoRef.current.play().catch(() => { })
        return true
      }
      return false
    }
    if (!attach()) {
      let n = 0
      const iv = setInterval(() => { if (attach() || ++n >= 40) clearInterval(iv) }, 100)
      return () => clearInterval(iv)
    }
  }, [localStream, isCalling, activeCall, isAnswering])

  // Drain buffered ICE candidates into an open peer connection
  const drainPendingIce = useCallback(async (pc) => {
    const candidates = [...pendingIceRef.current]
    pendingIceRef.current = []
    for (const c of candidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch (_) { }
    }
  }, [])

  // Watch: pendingAcceptedSignal — caller receives SDP answer from receiver
  useEffect(() => {
    if (!pendingAcceptedSignal) return
    const pc = peerRef.current
    if (!pc) { clearAcceptedSignal(); return }
    ; (async () => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingAcceptedSignal))
        await drainPendingIce(pc)
        // Also drain anything already in the signal queue
        const q = useCallStore.getState().remoteSignalQueue
        if (q.length > 0) {
          clearRemoteSignalQueue()
          for (const sig of q) {
            const cand = extractCandidate(sig)
            if (cand) try { await pc.addIceCandidate(new RTCIceCandidate(cand)) } catch (_) { }
          }
        }
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription (answer) error:', e)
      } finally {
        clearAcceptedSignal()
      }
    })()
  }, [pendingAcceptedSignal]) // eslint-disable-line

  // Watch: remoteSignalQueue — ICE candidates from remote
  useEffect(() => {
    if (remoteSignalQueue.length === 0) return
    const q = useCallStore.getState().remoteSignalQueue
    const pc = peerRef.current
    clearRemoteSignalQueue()

    if (!pc || !pc.remoteDescription) {
      // Buffer — remote description not ready yet
      for (const sig of q) {
        const cand = extractCandidate(sig)
        if (cand) pendingIceRef.current.push(cand)
      }
      return
    }
    ; (async () => {
      for (const sig of q) {
        const cand = extractCandidate(sig)
        if (cand) try { await pc.addIceCandidate(new RTCIceCandidate(cand)) } catch (_) { }
      }
    })()
  }, [remoteSignalQueue]) // eslint-disable-line

  // Watch: callRejected
  useEffect(() => {
    if (!callRejected) return
    callerTone.current.stop()
    callerTone.current.play(DECLINED_PATTERN)
    setShowDeclined(true)
    const ci = useCallStore.getState().callerInfo
    addCallRecord({
      name: ci?.name, initials: ci?.initials,
      type: useCallStore.getState().callMode || 'audio',
      dir: 'outgoing', status: 'rejected',
    })
    const t = setTimeout(() => {
      callerTone.current.stop()
      setShowDeclined(false)
      clearCallRejected()
      doCleanup()
    }, 3000)
    return () => clearTimeout(t)
  }, [callRejected]) // eslint-disable-line

  // Watch: callEndedByRemote
  useEffect(() => {
    if (!callEndedByRemote) return
    doCleanup()
  }, [callEndedByRemote]) // eslint-disable-line

  // ── Core helpers ─────────────────────────────────────────────────────────

  const doCleanup = useCallback(() => {
    callerTone.current.stop()
    receiverTone.current.stop()
    pendingIceRef.current = []
    if (peerRef.current) {
      try { peerRef.current.close() } catch (_) { }
      peerRef.current = null
    }
    remotePeerIdRef.current = null
    isInitiatingRef.current = false
    setIsAnswering(false)
    setIsMuted(false)
    setIsVideoOff(false)
    setPermError('')
    resetCall()
  }, [resetCall])

  const createPeer = useCallback((targetUserId) => {
    if (peerRef.current) {
      try { peerRef.current.close() } catch (_) { }
      peerRef.current = null
    }
    pendingIceRef.current = [] // clear stale candidates from any previous call

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerRef.current = pc
    remotePeerIdRef.current = targetUserId
    setPeerConnection(pc)

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('webrtc_signal', {
          to: targetUserId,
          signal: { type: 'candidate', candidate: e.candidate.toJSON() },
        })
      }
    }

    pc.ontrack = (e) => {
      console.log('[WebRTC] Got remote track:', e.track.kind)
      if (e.streams?.[0]) setRemoteStream(e.streams[0])
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setActiveCall(true)
        setIsAnswering(false) // ICE is done, isAnswering no longer needed
      }
      if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE failed — attempting restartIce')
        try { pc.restartIce() } catch (_) { }
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setActiveCall(true)
        setIsAnswering(false)
      }
      if (pc.connectionState === 'failed') {
        try { pc.restartIce() } catch (_) { }
      }
    }

    return pc
  }, [socket, setPeerConnection, setRemoteStream, setActiveCall])

  const getMedia = useCallback(async (wantVideo) => {
    setPermError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.warn('[Call] Media error:', err.name, err.message)
      if (wantVideo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          setLocalStream(stream)
          setPermError('Camera unavailable — audio-only mode')
          return stream
        } catch (_) { }
      }
      setPermError('Microphone access denied. Please allow it in browser settings.')
      throw new Error('media_denied')
    }
  }, [setLocalStream])

  // ── Caller side: initiate call ───────────────────────────────────────────
  const handleInitiateCall = useCallback(async () => {
    const store = useCallStore.getState()
    const isVideo = store.callMode === 'video'
    const targetId = String(store.callerInfo?.id || '')
    const fromId = String(user?._id || user?.id || '')

    if (!targetId || !socket || !user) {
      console.warn('[Call] Cannot initiate — missing targetId/socket/user')
      doCleanup(); return
    }
    console.log('[Call] Initiating →', { from: fromId, to: targetId, isVideo })

    try {
      const stream = await getMedia(isVideo)
      const pc = createPeer(targetId)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo })
      await pc.setLocalDescription(offer)

      socket.emit('call_user', { userToCall: targetId, signalData: offer, from: fromId, name: user.name, isVideo })
      console.log('[Call] call_user emitted →', targetId)
    } catch (err) {
      console.error('[Call] Initiate error:', err)
      isInitiatingRef.current = false
      if (err.message !== 'media_denied') doCleanup()
    }
  }, [socket, user, getMedia, createPeer, doCleanup])

  // Trigger when isCalling becomes true
  useEffect(() => {
    if (isCalling && !peerRef.current && !isInitiatingRef.current) {
      isInitiatingRef.current = true
      handleInitiateCall()
    }
  }, [isCalling, handleInitiateCall])

  // ── Receiver side: answer call ───────────────────────────────────────────
  const answerCall = async () => {
    const store = useCallStore.getState()
    const isVideo = store.callMode === 'video'
    const callerId = store.callerInfo?.id
    const signal = store.callerInfo?.signal

    console.log('[Call] answerCall — callerId:', callerId, '| hasSignal:', !!signal, '| isVideo:', isVideo)

    if (!callerId || !signal) {
      console.error('[Call] answerCall aborted — missing callerId or signal')
      doCleanup(); return
    }

    receiverTone.current.stop()

    // KEY FIX: set isAnswering BEFORE hiding the ring UI so the active call
    // overlay mounts immediately — no blank screen on the receiver side
    setIsAnswering(true)
    useCallStore.setState({ isReceivingCall: false })

    try {
      const stream = await getMedia(isVideo)
      const pc = createPeer(callerId)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      await pc.setRemoteDescription(new RTCSessionDescription(signal))
      console.log('[Call] setRemoteDescription (offer) done')

      // Drain buffered ICE candidates
      await drainPendingIce(pc)

      // Drain signal queue (candidates that arrived via socket before we answered)
      const storeQ = useCallStore.getState().remoteSignalQueue
      if (storeQ.length > 0) {
        clearRemoteSignalQueue()
        for (const sig of storeQ) {
          const cand = extractCandidate(sig)
          if (cand) try { await pc.addIceCandidate(new RTCIceCandidate(cand)) } catch (_) { }
        }
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit('answer_call', { to: callerId, signal: answer })
      console.log('[Call] answer_call emitted →', callerId)
    } catch (err) {
      console.error('[Call] Answer error:', err)
      if (err.message !== 'media_denied') endCall()
      else setIsAnswering(false)
    }
  }

  const rejectCall = () => {
    const ci = useCallStore.getState().callerInfo
    if (ci?.id && socket) socket.emit('reject_call', { to: ci.id })
    logCall({
      name: ci?.name, initials: ci?.initials,
      type: useCallStore.getState().callMode || 'audio',
      dir: 'incoming', status: 'missed',
      receiverId: ci?.id,
    })
    doCleanup()
  }

  const endCall = useCallback(() => {
    const remoteId = remotePeerIdRef.current || useCallStore.getState().callerInfo?.id
    const ci = useCallStore.getState().callerInfo
    const elapsed = callStartRef.current > 0 ? Math.round((Date.now() - callStartRef.current) / 1000) : 0
    const st = useCallStore.getState()
    const isCallerSide = st.isCalling || (!st.isReceivingCall && !isAnswering)

    if (remoteId && socket) socket.emit('end_call', { to: remoteId })

    logCall({
      name: ci?.name, initials: ci?.initials,
      type: st.callMode || 'audio',
      dir: isCallerSide ? 'outgoing' : 'incoming',
      status: elapsed > 0 ? 'answered' : 'missed',
      duration: elapsed > 0 ? fmtDuration(elapsed) : null,
      receiverId: remoteId,
    })

    doCleanup()
  }, [socket, doCleanup, logCall, isAnswering])

  const toggleMute = () => {
    const tracks = localStream?.getAudioTracks() ?? []
    tracks.forEach(t => { t.enabled = !t.enabled })
    setIsMuted(tracks[0] ? !tracks[0].enabled : false)
  }

  const toggleVideo = () => {
    const tracks = localStream?.getVideoTracks() ?? []
    tracks.forEach(t => { t.enabled = !t.enabled })
    setIsVideoOff(tracks[0] ? !tracks[0].enabled : false)
  }

  // Show call UI when:
  // - caller is ringing/connecting   (isCalling)
  // - call is active                 (activeCall)
  // - receiver just answered         (isAnswering) ← KEY FIX
  const showCallUI = activeCall || isCalling || isAnswering

  return (
    <>
      {children}

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <AnimatePresence>
        {showDeclined && (
          <motion.div key="declined"
            initial={{ opacity: 0, y: -40, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -40, scale: .9 }}
            style={{ position: 'fixed', top: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', padding: '14px 32px', borderRadius: 20, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 16px 48px rgba(239,68,68,.5)', whiteSpace: 'nowrap' }}>
            📵 Call was declined
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* ── Incoming call card (receiver only, before answering) ── */}
        {isReceivingCall && !activeCall && !isAnswering && (
          <motion.div key="incoming"
            initial={{ opacity: 0, scale: .85, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .85, y: 30 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
          >
            <div style={{ width: 340, background: 'linear-gradient(160deg,#12122a,#0d1020)', border: '1px solid rgba(139,92,246,.25)', borderRadius: 28, padding: '32px 28px 28px', boxShadow: '0 32px 80px rgba(0,0,0,.75)', backdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 20, padding: '4px 12px', marginBottom: 24, color: '#10B981', fontSize: 10, fontWeight: 700, letterSpacing: '.05em' }}>
                <Lock size={9} /> END-TO-END ENCRYPTED
              </div>

              <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                {[150, 122, 96].map((sz, i) => (
                  <motion.div key={i}
                    style={{ position: 'absolute', width: sz, height: sz, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,.18)' }}
                    animate={{ scale: [1, 1.1, 1], opacity: [.4, 0, .4] }}
                    transition={{ duration: 2.2, delay: i * .4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
                <div style={{ width: 82, height: 82, borderRadius: '50%', background: 'linear-gradient(145deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: '#fff', boxShadow: '0 0 0 4px rgba(124,58,237,.3),0 12px 32px rgba(124,58,237,.5)', zIndex: 5, position: 'relative' }}>
                  {callerInfo?.initials}
                </div>
              </div>

              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>{callerInfo?.name}</h2>
              <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, margin: '0 0 32px', display: 'flex', alignItems: 'center', gap: 7 }}>
                {callMode === 'video' ? <><Video size={14} color="#8B5CF6" /> Incoming video call</> : <><Phone size={14} color="#8B5CF6" /> Incoming voice call</>}
              </p>

              <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .92 }} onClick={rejectCall}
                    style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(239,68,68,.5)' }}>
                    <PhoneOff size={26} />
                  </motion.button>
                  <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 600 }}>Decline</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .92 }} onClick={answerCall}
                    style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(16,185,129,.5)', animation: 'callpulse 1.8s infinite' }}>
                    {callMode === 'video' ? <Video size={26} /> : <Phone size={26} />}
                  </motion.button>
                  <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 600 }}>Accept</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Active call / connecting (both caller and receiver) ── */}
        {showCallUI && (
          <motion.div key="active"
            initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: '#000', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}
          >
            {callMode === 'video'
              ? <VideoCallUI
                callerInfo={callerInfo} activeCall={activeCall} isCalling={isCalling} isAnswering={isAnswering}
                isMuted={isMuted} isVideoOff={isVideoOff} callTime={callTime} formatTime={formatTime}
                remoteVideoRef={remoteVideoRef} localVideoRef={localVideoRef}
                toggleMute={toggleMute} toggleVideo={toggleVideo} endCall={endCall} permError={permError}
              />
              : <VoiceCallUI
                callerInfo={callerInfo} activeCall={activeCall} isCalling={isCalling} isAnswering={isAnswering}
                isMuted={isMuted} callTime={callTime} formatTime={formatTime}
                toggleMute={toggleMute} endCall={endCall} permError={permError}
              />
            }
          </motion.div>
        )}
      </AnimatePresence>

      <style>{GLOBAL_CSS}</style>
    </>
  )
}

function VideoCallUI({ callerInfo, activeCall, isCalling, isAnswering, isMuted, isVideoOff, callTime, formatTime, remoteVideoRef, localVideoRef, toggleMute, toggleVideo, endCall, permError }) {
  const connecting = !activeCall
  const statusText = isCalling ? 'Ringing…' : isAnswering ? 'Connecting…' : 'Connecting…'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a1a' }}>
      {permError && <PermBanner msg={permError} />}
      <video ref={remoteVideoRef} playsInline autoPlay
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, background: '#000' }} />

      {connecting && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0a0a1a,#1a0a2e)' }}>
          <PulsingAvatar initials={callerInfo?.initials} />
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>{callerInfo?.name}</h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 16, margin: '0 0 24px' }}>{statusText}</p>
          <BounceDots />
        </div>
      )}

      <motion.div drag
        dragConstraints={{ top: 10, left: 10, right: window.innerWidth - 175, bottom: window.innerHeight - 260 }}
        initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'absolute', bottom: 110, right: 20, width: 135, height: 190, borderRadius: 16, overflow: 'hidden', border: '2.5px solid rgba(255,255,255,.3)', boxShadow: '0 8px 32px rgba(0,0,0,.6)', zIndex: 10, cursor: 'grab', background: '#1a1a2e' }}>
        <video ref={localVideoRef} playsInline autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        {isVideoOff && (
          <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VideoOff size={28} color="rgba(255,255,255,.4)" />
          </div>
        )}
      </motion.div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, padding: '18px 24px', background: 'linear-gradient(rgba(0,0,0,.75),transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ background: 'rgba(0,0,0,.5)', padding: '5px 14px', borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(8px)' }}>
          <Lock size={11} color="#10B981" /> End-to-end encrypted
        </div>
        {activeCall && (
          <div style={{ background: 'rgba(0,0,0,.5)', padding: '6px 16px', borderRadius: 20, color: '#fff', fontSize: 14, fontWeight: 700, border: '1px solid rgba(255,255,255,.15)', backdropFilter: 'blur(8px)' }}>
            {formatTime(callTime)}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5, padding: '24px 0 32px', background: 'linear-gradient(transparent,rgba(0,0,0,.9))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <ControlBtn onClick={toggleMute} active={isMuted} activeColor="#EF4444" icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />} label={isMuted ? 'Unmute' : 'Mute'} />
        <ControlBtn onClick={toggleVideo} active={isVideoOff} activeColor="#EF4444" icon={isVideoOff ? <VideoOff size={22} /> : <Video size={22} />} label={isVideoOff ? 'Show cam' : 'Hide cam'} />
        <EndCallBtn onClick={endCall} />
      </div>
    </div>
  )
}

function VoiceCallUI({ callerInfo, activeCall, isCalling, isAnswering, isMuted, callTime, formatTime, toggleMute, endCall, permError }) {
  const statusText = activeCall
    ? `⏱ ${formatTime(callTime)}`
    : isCalling ? 'Ringing…' : 'Connecting…'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 30%,rgba(124,58,237,.45) 0%,transparent 52%),radial-gradient(ellipse at 80% 70%,rgba(99,102,241,.35) 0%,transparent 52%),linear-gradient(180deg,#0a0a1a,#0f0a2e 50%,#0a0a1a)' }} />

      {[{ w: 500, top: '-10%', left: '-10%', bg: 'rgba(124,58,237,.12)', dur: 8 },
      { w: 400, top: '50%', right: '-15%', bg: 'rgba(99,102,241,.1)', dur: 10 },
      { w: 300, top: '20%', left: '60%', bg: 'rgba(167,139,250,.08)', dur: 7 }].map((o, i) => (
        <motion.div key={i} animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
          style={{ position: 'absolute', width: o.w, height: o.w, top: o.top, left: o.left, right: o.right, borderRadius: '50%', background: o.bg, filter: 'blur(60px)', pointerEvents: 'none' }} />
      ))}

      {permError && <PermBanner msg={permError} />}

      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', padding: '5px 14px', borderRadius: 20, color: '#10B981', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)', zIndex: 2, whiteSpace: 'nowrap' }}>
        <Lock size={10} /> END-TO-END ENCRYPTED
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, zIndex: 2 }}>
        {[220, 180, 145].map((sz, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', width: sz, height: sz, borderRadius: '50%', border: `1.5px solid rgba(139,92,246,${.1 + i * .08})` }}
            animate={{ scale: [1, 1.06 + i * .02, 1], opacity: [.3, .8, .3] }}
            transition={{ duration: 2.5 + i * .5, delay: i * .4, repeat: Infinity }} />
        ))}
        <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(124,58,237,.5)', filter: 'blur(30px)' }} />
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(145deg,#7C3AED,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, fontWeight: 800, color: '#fff', position: 'relative', zIndex: 5, boxShadow: '0 0 0 4px rgba(139,92,246,.3),0 20px 40px rgba(124,58,237,.5)' }}>
          {callerInfo?.initials}
        </div>
      </div>

      <h2 style={{ color: '#fff', fontSize: 34, fontWeight: 800, margin: '0 0 8px', textAlign: 'center', zIndex: 2 }}>{callerInfo?.name}</h2>
      <p style={{ color: activeCall ? '#10B981' : '#8B5CF6', margin: '0 0 16px', fontSize: 16, fontWeight: 600, textAlign: 'center', zIndex: 2 }}>
        {statusText}
      </p>

      {activeCall && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 52, zIndex: 2 }}>
          {[14, 22, 30, 18, 28, 36, 20, 26, 16, 24].map((h, i) => (
            <motion.div key={i} animate={{ scaleY: [.3, 1, .3] }}
              transition={{ duration: .8 + i * .08, delay: i * .07, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 3, height: h, borderRadius: 4, background: 'linear-gradient(180deg,#8B5CF6,#6366F1)', transformOrigin: 'center' }} />
          ))}
        </div>
      )}
      {!activeCall && (
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <BounceDots />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '22px 44px', borderRadius: 30, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(20px)', zIndex: 2 }}>
        <ControlBtn onClick={toggleMute} active={isMuted} activeColor="#EF4444"
          icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          label={isMuted ? 'Unmute' : 'Mute'} voice />
        <EndCallBtn onClick={endCall} />
      </div>
    </div>
  )
}

function ControlBtn({ onClick, active, activeColor, icon, label, voice }) {
  const base = voice
    ? { width: 58, height: 58, borderRadius: 29, border: `1.5px solid ${active ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.12)'}`, background: active ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.08)', backdropFilter: 'blur(8px)' }
    : { width: 54, height: 54, borderRadius: 27, border: 'none', background: active ? `${activeColor}22` : 'rgba(255,255,255,.13)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: .92 }} onClick={onClick}
        style={{ ...base, color: active ? (activeColor || '#EF4444') : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
        {icon}
      </motion.button>
      {label && <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 600 }}>{label}</span>}
    </div>
  )
}

function EndCallBtn({ onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .93 }} onClick={onClick}
        style={{ width: 70, height: 70, borderRadius: 35, border: 'none', background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(239,68,68,.6)' }}>
        <PhoneOff size={28} />
      </motion.button>
      <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, fontWeight: 600 }}>End Call</span>
    </div>
  )
}

function PulsingAvatar({ initials }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      {[200, 165, 130].map((sz, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: sz, height: sz, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,.2)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [.2, .6, .2] }} transition={{ duration: 2.5 + i * .5, delay: i * .4, repeat: Infinity }} />
      ))}
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(145deg,#7C3AED,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800, color: '#fff', zIndex: 5, boxShadow: '0 0 40px rgba(124,58,237,.6)' }}>
        {initials}
      </div>
    </div>
  )
}

function BounceDots() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B5CF6' }}
          animate={{ opacity: [.3, 1, .3], y: [0, -6, 0] }} transition={{ delay: i * .2, duration: .9, repeat: Infinity }} />
      ))}
    </div>
  )
}

function PermBanner({ msg }) {
  return (
    <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'rgba(239,68,68,.92)', color: '#fff', padding: '12px 28px', borderRadius: 14, fontWeight: 600, fontSize: 14, textAlign: 'center', maxWidth: '90%' }}>
      ⚠️ {msg}
    </div>
  )
}

const GLOBAL_CSS = `
  @keyframes callpulse {
    0%   { box-shadow: 0 0 0 0   rgba(16,185,129,.7); }
    70%  { box-shadow: 0 0 0 18px rgba(16,185,129,0);  }
    100% { box-shadow: 0 0 0 0   rgba(16,185,129,0);  }
  }
`