/**
 * useCallStore.js
 * Central Zustand store for ALL call state.
 *
 * Now uses real backend call logs via callAPI for persistent history.
 * Socket events are handled in useStore.initSocket() and call these
 * actions directly — events are never missed due to component lifecycle.
 */
import { create } from 'zustand'
import { callAPI } from '../api/client'
import useStore from './useStore'

export const useCallStore = create((set, get) => ({
  // ── Core state ───────────────────────────────────────────────────────────
  isReceivingCall: false,
  isCalling: false,
  activeCall: false,
  callMode: null,   // 'audio' | 'video'
  callerInfo: null,   // { id, name, initials, signal?, isVideo }
  remoteStream: null,
  localStream: null,
  peerConnection: null,

  // ── Signal queue state (watched by CallProvider) ─────────────────────
  pendingAcceptedSignal: null,
  remoteSignalQueue: [],
  callRejected: false,
  callEndedByRemote: false,

  // ── Call history (from backend) ──────────────────────────────────────
  callHistory: [],
  callHistoryLoaded: false,

  // ── Call timer ───────────────────────────────────────────────────────
  callStartTime: null,

  // ── Basic setters ────────────────────────────────────────────────────
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setActiveCall: (active) => set({ activeCall: active, callStartTime: active ? Date.now() : null }),
  setPeerConnection: (pc) => set({ peerConnection: pc }),

  /**
   * setIncomingCall — called when incoming_call socket event fires.
   * Clears all stale signal state from any previous call.
   */
  setIncomingCall: (caller) => set({
    isReceivingCall: true,
    isCalling: false,
    activeCall: false,
    callerInfo: caller,
    callMode: caller.isVideo ? 'video' : 'audio',
    pendingAcceptedSignal: null,
    remoteSignalQueue: [],
    callRejected: false,
    callEndedByRemote: false,
    callStartTime: null,
  }),

  /**
   * setCalling — called when user clicks Call/Video button.
   */
  setCalling: (userToCall, isVideo) => set({
    isCalling: true,
    isReceivingCall: false,
    activeCall: false,
    callMode: isVideo ? 'video' : 'audio',
    callerInfo: userToCall,
    pendingAcceptedSignal: null,
    remoteSignalQueue: [],
    callRejected: false,
    callEndedByRemote: false,
    callStartTime: null,
  }),

  /**
   * setCallAccepted — receiver sent their answer SDP.
   * CallProvider watches pendingAcceptedSignal and applies it to the peer.
   */
  setCallAccepted: (signal) => set({
    activeCall: true,
    pendingAcceptedSignal: signal,
    callStartTime: Date.now(),
  }),

  clearAcceptedSignal: () => set({ pendingAcceptedSignal: null }),

  /**
   * setCallRejected — receiver declined.
   */
  setCallRejected: () => set({ callRejected: true }),
  clearCallRejected: () => set({ callRejected: false }),

  /**
   * setCallEndedByRemote — remote peer hung up.
   */
  setCallEndedByRemote: () => set({ callEndedByRemote: true }),

  /**
   * pushRemoteSignal — ICE candidate received from remote.
   * Server sends the inner signal object: { type:'candidate', candidate:{...} }
   */
  pushRemoteSignal: (signal) => set((state) => ({
    remoteSignalQueue: [...state.remoteSignalQueue, signal],
  })),

  clearRemoteSignalQueue: () => set({ remoteSignalQueue: [] }),

  // ══════════════════════════════════════════════════════════════════════
  // 📞 CALL HISTORY — REAL BACKEND DATA
  // ══════════════════════════════════════════════════════════════════════

  /**
   * loadCallHistory — fetch from backend API on initial load.
   */
  loadCallHistory: async () => {
    try {
      const data = await callAPI.getHistory()
      set({ callHistory: data || [], callHistoryLoaded: true })
    } catch (err) {
      console.error('Failed to load call history:', err)
      set({ callHistoryLoaded: true })
    }
  },

  /**
   * logCall — create a call log in the backend and prepend to local state.
   */
  logCall: async (record) => {
    try {
      const { callerInfo, callMode, callStartTime } = get()
      const receiverId = record.receiverId || callerInfo?.id
      if (!receiverId) return

      const durationSec = (record.status === 'answered' && callStartTime)
        ? Math.round((Date.now() - callStartTime) / 1000)
        : 0

      await callAPI.createLog(
        receiverId,
        record.type || callMode || 'audio',
        record.status || 'answered',
        durationSec,
      )
      // Signal to the other peer to refresh their log history
      useStore.getState().socket?.emit('call_logged', { to: receiverId })

      // Reload from server to get populated data
      await get().loadCallHistory()
    } catch (err) {
      console.error('Failed to log call:', err)
    }
  },

  /**
   * deleteCallLog — remove a single entry.
   */
  deleteCallLog: async (id) => {
    try {
      await callAPI.deleteLog(id)
      set(state => ({ callHistory: state.callHistory.filter(c => c.id !== id) }))
    } catch (err) {
      console.error('Failed to delete call log:', err)
    }
  },

  /**
   * clearCallHistory — wipe all from backend.
   */
  clearAllCallHistory: async () => {
    try {
      await callAPI.clearHistory()
      set({ callHistory: [] })
    } catch (err) {
      console.error('Failed to clear call history:', err)
    }
  },

  /**
   * resetCall — full teardown. Stops tracks, closes peer, resets all state.
   */
  resetCall: () => {
    const { localStream, peerConnection } = get()
    if (localStream) {
      try { localStream.getTracks().forEach(t => t.stop()) } catch (_) { }
    }
    if (peerConnection) {
      try { peerConnection.close() } catch (_) { }
    }
    set({
      isReceivingCall: false,
      isCalling: false,
      activeCall: false,
      callMode: null,
      callerInfo: null,
      remoteStream: null,
      localStream: null,
      peerConnection: null,
      pendingAcceptedSignal: null,
      remoteSignalQueue: [],
      callRejected: false,
      callEndedByRemote: false,
      callStartTime: null,
    })
  },
}))