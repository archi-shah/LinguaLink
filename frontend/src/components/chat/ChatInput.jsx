import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Smile, Paperclip, Mic, Send, Zap, Square, Plus, Trash2, X, Keyboard } from 'lucide-react'
import useStore from '../../store/useStore.js'
import AttachmentMenu from './AttachmentMenu.jsx'
import EmojiPicker from './EmojiPicker.jsx'
import ImageEditor from './ImageEditor.jsx'
import { chatAPI } from '../../api/client.js'
import { ReactTransliterate, TriggerKeys } from 'react-transliterate'
import 'react-transliterate/dist/index.css'

export default function ChatInput() {
  const [text, setText]           = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [useTransliteration, setUseTransliteration] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const pendingFileRef = useRef(null) // ref mirror to avoid stale closures
  const [captionText, setCaptionText] = useState('') // caption for file preview modal
  const captionRef = useRef('') // ref mirror for captionText to avoid stale closures in send handlers
  const [isUploading, setIsUploading] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)

  const [isFocused, setIsFocused] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [attachmentNotice, setAttachmentNotice] = useState('')
  const sendMessage = useStore(s => s.sendMessage)
  const user = useStore(s => s.user)
  const socket = useStore(s => s.socket)
  const activeChat = useStore(s => s.activeChat)
  const darkMode = useStore(s => s.darkMode)
  const replyingTo = useStore(s => s.replyingTo)
  const setReplyingTo = useStore(s => s.setReplyingTo)
  const textRef = useRef()
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const isRecordingCancelledRef = useRef(false)
  const typingTimeoutRef = useRef(null)
  const preferredLanguage = user?.language || user?.preferences?.language || user?.preferences?.primaryLanguage || 'en'
  const userPrefLang = preferredLanguage.toLowerCase()
  const shortPrefLang = userPrefLang.substring(0, 2).toUpperCase()
  
  const viewLangOverride = useStore(s => s.viewLangOverride)
  const setViewLangOverride = useStore(s => s.setViewLangOverride)
  const activeLang = viewLangOverride || userPrefLang

  const playSound = useStore(s => s.playSound)

  const getTransliterateLang = () => {
    const l = userPrefLang.substring(0, 2);
    const supported = ['am', 'ar', 'bn', 'zh', 'el', 'gu', 'hi', 'kn', 'ml', 'mr', 'ne', 'or', 'fa', 'pa', 'ru', 'sa', 'si', 'sr', 'ta', 'te', 'ti', 'ur', 'vi'];
    if (supported.includes(l)) return l;
    return null; // English or unsupported languages do not need transliteration toggle
  };
  const transLang = getTransliterateLang();

  // Generate a stable blob URL for the pending file preview (PDF, audio, video)
  useEffect(() => {
    if (pendingFile) {
      const f = pendingFile.file
      const isImg = f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)
      // Images are handled by ImageEditor which manages its own URL; skip them here
      if (!isImg) {
        const url = URL.createObjectURL(f)
        setPdfPreviewUrl(url) // reusing this state for all non-image previews
        return () => URL.revokeObjectURL(url)
      } else {
        setPdfPreviewUrl(null)
      }
    } else {
      setPdfPreviewUrl(null)
    }
  }, [pendingFile])

  // Auto-enable transliteration if the language supports it and active lang is not English
  useEffect(() => {
    if (transLang && activeLang !== 'en') {
      setUseTransliteration(true);
    } else {
      setUseTransliteration(false);
    }
  }, [transLang, activeLang]);


  useEffect(() => {
    if (!isRecording) return
    const timer = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [isRecording])

  const handleSend = () => {
    // Use ref (not state) to avoid stale closure — pendingFileRef is always up-to-date
    if (pendingFileRef.current) {
      confirmSendFile()
      return
    }
    if (!text.trim()) return
    playSound('send')
    // Build metadata – include reply info if replying
    const metadata = replyingTo
      ? { replyTo: { id: replyingTo._id || replyingTo.id, sender: replyingTo.senderName || replyingTo.sender || 'Someone', text: replyingTo.text || replyingTo.originalText || '' } }
      : {}
    sendMessage(text, undefined, preferredLanguage, '', 'text', metadata)
    setText('')
    setShowEmoji(false)
    setReplyingTo(null) // Clear reply after sending
    if (socket && activeChat) {
      socket.emit('stop_typing', { chatId: activeChat })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.focus()
    }
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    if (!socket || !activeChat || !user) return

    socket.emit('typing', { chatId: activeChat, userName: user.name })
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { chatId: activeChat })
    }, 2000)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const hasText = text.trim().length > 0
  const formattedRecordTime = `${String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:${String(recordSeconds % 60).padStart(2, '0')}`

  const addEmoji = (emoji) => {
    setText(prev => `${prev}${emoji}`)
    requestAnimationFrame(() => textRef.current?.focus())
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      playSound('record_start')
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      isRecordingCancelledRef.current = false

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (isRecordingCancelledRef.current) return
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' })
        
        // Voice notes send immediately, no preview modal
        const state = useStore.getState()
        const currentChatId = state.activeChat
        if (!currentChatId) return

        try {
          const tempId = Date.now()
          const optimisticMsg = {
            id: tempId,
            type: 'sent',
            text: '',
            translated: '',
            mediaType: 'audio',
            mediaUrl: '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ticks: 0,
            status: 'sending'
          }
          useStore.getState().appendMessage(currentChatId, optimisticMsg)

          setIsUploading(true)
          setAttachmentNotice('Uploading voice note...')
          const formData = new FormData()
          formData.append('audio', file)
          const newMsg = await chatAPI.uploadAudioMessage(currentChatId, formData)
          setIsUploading(false)
          setAttachmentNotice('')
          
          if (!newMsg || newMsg.error) throw new Error(newMsg?.error || newMsg?.message || 'Upload failed')
          
          if (state.socket) {
            state.socket.emit('send_message', { chatId: currentChatId, message: newMsg })
          }
            // Replace the optimistic message
            const formattedMsg = {
              ...newMsg,
              id: newMsg._id || newMsg.id,
              text: newMsg.originalText || newMsg.text || '',
              translated: newMsg.translatedText || newMsg.translated || '',
              type: 'sent',
              ticks: 1,
              time: new Date(newMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            useStore.getState().replaceMessage(currentChatId, tempId, formattedMsg)
        } catch (err) {
          setIsUploading(false)
          setAttachmentNotice('Failed to upload audio')
          setTimeout(() => setAttachmentNotice(''), 3000)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordSeconds(0)
    } catch (err) {
      console.error('Mic access denied', err)
      alert('Microphone access is required for voice notes.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      playSound('record_stop')
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    isRecordingCancelledRef.current = true
    stopRecording()
  }

  const toggleRecording = () => {
    if (isRecording) stopRecording()
    else startRecording()
  }

  const handleAttachmentSelect = async (msg) => {
    // Camera photos: send immediately without preview/editor
    if (msg && msg.type === 'file' && msg.label === 'Camera') {
      const state = useStore.getState()
      const currentChatId = state.activeChat
      if (!currentChatId || !msg.file) return
      try {
        const tempId = Date.now()
        const optimisticMsg = {
          id: tempId,
          type: 'sent',
          text: '',
          translated: '',
          mediaType: 'image',
          mediaUrl: '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticks: 0,
          status: 'sending'
        }
        useStore.getState().appendMessage(currentChatId, optimisticMsg)

        setIsUploading(true)
        setAttachmentNotice('Uploading photo...')
        const formData = new FormData()
        formData.append('file', msg.file)
        const newMsg = await chatAPI.uploadFileMessage(currentChatId, formData)
        setIsUploading(false)
        setAttachmentNotice('')
        if (!newMsg || newMsg.error) throw new Error('Upload failed')
        if (state.socket) {
          state.socket.emit('send_message', { chatId: currentChatId, message: newMsg })
        }
        const formattedMsg = {
          ...newMsg,
          id: newMsg._id || newMsg.id,
          text: newMsg.originalText || newMsg.text || '',
          translated: newMsg.translatedText || newMsg.translated || '',
          type: 'sent',
          ticks: 1,
          time: new Date(newMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        useStore.getState().replaceMessage(currentChatId, tempId, formattedMsg)
      } catch (err) {
        setIsUploading(false)
        setAttachmentNotice('Photo upload failed')
        setTimeout(() => setAttachmentNotice(''), 3000)
      }
      return
    }

    if (msg && msg.type === 'file') {
      const pf = { file: msg.file, label: msg.label || 'File' }
      pendingFileRef.current = pf
      setPendingFile(pf)
      setCaptionText('')
      captionRef.current = ''
      setIsUploading(false) // reset any stuck upload state
      return
    }

    if (typeof msg === 'object' && msg.mediaType) {
      sendMessage(msg.text, undefined, preferredLanguage, '', msg.mediaType, msg.metadata)
    } else if (typeof msg === 'string' && (msg.startsWith('📊') || msg.startsWith('📅') || msg.startsWith('📍') || msg.startsWith('👤') || msg.includes(':'))) {
      sendMessage(msg, undefined, preferredLanguage)
    } else {
      setAttachmentNotice(typeof msg === 'string' ? msg : 'Attachment selected')
      setTimeout(() => setAttachmentNotice(''), 1800)
    }
  }

  const confirmSendFile = async (customFile = null, customCaption = null) => {
    // Read from ref to avoid stale closure — pendingFileRef is always current
    const fileToUpload = customFile || (pendingFileRef.current ? pendingFileRef.current.file : null)
    if (!fileToUpload) {
      console.warn('[ChatInput] confirmSendFile called but no file available')
      return
    }

    // Capture caption from ref (always up-to-date) or the passed value
    const caption = customCaption !== null ? customCaption : captionRef.current

    // Clear modal immediately so UI feels snappy
    pendingFileRef.current = null
    setPendingFile(null)
    setCaptionText('')
    captionRef.current = ''

    try {
      const isAudio = (fileToUpload.type || '').startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(fileToUpload.name || '')
      
      const state = useStore.getState()
      const currentChatId = state.activeChat
      if (!currentChatId) throw new Error('No active chat selected')
      
      const tempId = Date.now()
      const isImg = (fileToUpload.type || '').startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileToUpload.name || '')
      const isVid = (fileToUpload.type || '').startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(fileToUpload.name || '')
      const mediaType = isAudio ? 'audio' : isImg ? 'image' : isVid ? 'video' : 'document'
      
      const optimisticMsg = {
        id: tempId,
        type: 'sent',
        text: caption.trim() || '',
        translated: caption.trim() || '',
        mediaType,
        mediaUrl: '',
        metadata: { fileName: fileToUpload.name, fileSize: fileToUpload.size, uploading: true },
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ticks: 0,
        status: 'sending'
      }
      useStore.getState().appendMessage(currentChatId, optimisticMsg)

      setIsUploading(true)
      setAttachmentNotice(`Uploading ${fileToUpload.name || 'file'}...`)

      console.log('[ChatInput] uploadFile — chatId:', currentChatId, '| file:', fileToUpload.name, fileToUpload.type, fileToUpload.size, '| isAudio:', isAudio)

      const formData = new FormData()
      let newMsg

      if (isAudio) {
        formData.append('audio', fileToUpload)
        if (caption.trim()) formData.append('text', caption.trim())
        if (replyingTo) {
          formData.append('replyTo', JSON.stringify({
            id: replyingTo._id || replyingTo.id,
            sender: replyingTo.senderName || replyingTo.sender || 'Someone',
            text: replyingTo.text || replyingTo.originalText || ''
          }))
          setReplyingTo(null)
        }
        console.log('[ChatInput] calling uploadAudioMessage for chatId:', currentChatId)
        newMsg = await chatAPI.uploadAudioMessage(currentChatId, formData)
        console.log('[ChatInput] uploadAudioMessage response:', newMsg)
      } else {
        formData.append('file', fileToUpload)
        if (caption.trim()) formData.append('text', caption.trim())
        if (replyingTo) {
          formData.append('replyTo', JSON.stringify({
            id: replyingTo._id || replyingTo.id,
            sender: replyingTo.senderName || replyingTo.sender || 'Someone',
            text: replyingTo.text || replyingTo.originalText || ''
          }))
          setReplyingTo(null)
        }
        console.log('[ChatInput] calling uploadFileMessage for chatId:', currentChatId)
        newMsg = await chatAPI.uploadFileMessage(currentChatId, formData)
        console.log('[ChatInput] uploadFileMessage response:', newMsg)
      }

      if (!newMsg || newMsg.error) {
        throw new Error(newMsg?.error || newMsg?.message || 'Upload failed silently')
      }

      setIsUploading(false)
      setAttachmentNotice('')

      const latestState = useStore.getState()
      if (latestState.socket) {
        latestState.socket.emit('send_message', { chatId: currentChatId, message: newMsg })
      }

      const formattedMsg = {
        ...newMsg,
        id: newMsg._id || newMsg.id,
        text: newMsg.originalText || newMsg.text || '',
        translated: newMsg.translatedText || newMsg.translated || '',
        type: 'sent',
        ticks: 1,
        time: new Date(newMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      useStore.getState().replaceMessage(currentChatId, tempId, formattedMsg)
      console.log('[ChatInput] File sent successfully! mediaType:', newMsg.mediaType, 'mediaUrl:', newMsg.mediaUrl)
    } catch (err) {
      setIsUploading(false)
      console.error('[ChatInput] File upload FAILED:', err)
      console.error('[ChatInput] Error stack:', err.stack)
      setAttachmentNotice('Upload failed: ' + (err.message || 'Unknown error'))
      setTimeout(() => setAttachmentNotice(''), 5000)
    }
  }

  return (
    <div className="chat-composer premium-composer" style={{ padding: '10px 16px', position: 'relative' }}>
      {/* Pending File Preview — WhatsApp Full Screen Style */}
      {pendingFile && typeof document !== 'undefined' && createPortal(
        (() => {
          const f = pendingFile.file
          const isImg = f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)
          const isAud = f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(f.name)
          const isVid = f.type.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(f.name)
          const sizeMB = (f.size / 1024 / 1024).toFixed(2)
          const previewUrl = pdfPreviewUrl  // stable blob URL from state (managed by useEffect)

          if (isImg) {
            return (
              <ImageEditor 
                file={f} 
                onClose={() => { pendingFileRef.current = null; setPendingFile(null); }} 
                onSend={(editedFile, caption) => {
                  pendingFileRef.current = null;
                  setPendingFile(null);
                  confirmSendFile(editedFile, caption);
                }} 
              />
            );
          }

          const ext = f.name.split('.').pop().toUpperCase()
          const colorMap = { PDF: '#E53E3E', DOC: '#2B6CB0', DOCX: '#2B6CB0', XLS: '#2F855A', XLSX: '#2F855A', PPT: '#C05621', PPTX: '#C05621', ZIP: '#744210', RAR: '#744210', TXT: '#4A5568', CSV: '#276749' }
          const docColor = colorMap[ext] || '#6B46C1'

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 999999, background: '#0B141A', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
                <button type="button" onClick={() => { pendingFileRef.current = null; setPendingFile(null); setCaptionText(''); }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600 }}>
                  <X size={26} />
                </button>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>Send {isAud ? 'Audio' : 'Document'}</div>
                {/* Spacer to balance the layout since the X button is on the left */}
                <div style={{ width: '26px' }} />
              </div>
              
              {/* Main Preview Area */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isVid ? '0' : '24px', overflow: 'hidden', minHeight: 0 }}>
                {isVid ? (
                  <video src={previewUrl || ''} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', margin: '24px' }} />
                ) : isAud ? (
                  /* Audio Preview */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'linear-gradient(135deg,#F97316,#FB923C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '54px', marginBottom: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                      🎵
                    </div>
                    <h2 style={{ margin: '0 0 10px', fontSize: '22px', textAlign: 'center', maxWidth: '80vw', wordBreak: 'break-all' }}>{f.name}</h2>
                    <p style={{ margin: 0, opacity: 0.7, fontSize: '15px' }}>{sizeMB} MB · Audio file</p>
                    {/* Audio element for playback preview */}
                    <audio src={previewUrl || ''} controls style={{ marginTop: '20px', borderRadius: '8px', width: '80%', maxWidth: '320px' }} />
                  </div>
                ) : (
                  /* Document Preview (PDF and other files) — styled card matching WhatsApp */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', maxWidth: '340px', width: '100%' }}>
                    {/* Large document card preview */}
                    <div style={{ width: '180px', height: '240px', background: '#fff', borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', marginBottom: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                      {/* Colored header band */}
                      <div style={{ height: '8px', background: docColor, flexShrink: 0 }} />
                      {/* Simulated document content lines */}
                      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[100, 85, 100, 72, 90, 65, 100, 78, 55, 88].map((w, i) => (
                          <div key={i} style={{ height: '7px', background: i === 0 ? '#1a1a2e' : '#E2E8F0', borderRadius: '3px', width: `${w}%`, opacity: i === 0 ? 0.85 : 0.6 }} />
                        ))}
                      </div>
                      {/* File type badge at bottom right */}
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: docColor, color: '#fff', fontSize: '12px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px' }}>
                        {ext || 'FILE'}
                      </div>
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: '18px', textAlign: 'center', maxWidth: '80vw', wordBreak: 'break-all', fontWeight: 700 }}>{f.name}</h2>
                    <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>{sizeMB} MB · {ext} Document</p>
                  </div>
                )}
              </div>

              {/* Footer — caption optional, Send is always immediately reachable */}
              <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                <input 
                  type="text" 
                  placeholder="Add a caption (optional)..." 
                  value={captionText} 
                  onChange={(e) => { setCaptionText(e.target.value); captionRef.current = e.target.value; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isUploading) { e.preventDefault(); e.stopPropagation(); confirmSendFile(null, captionRef.current) } }}
                  style={{
                    flex: 1, padding: '14px 18px', borderRadius: '24px', border: 'none',
                    background: '#2A3942', color: '#fff', fontSize: '15px', outline: 'none'
                  }}
                />
                <button 
                  onClick={() => !isUploading && confirmSendFile(null, captionRef.current)}
                  type="button"
                  disabled={isUploading}
                  style={{
                    width: '52px', height: '52px', borderRadius: '50%', border: 'none',
                    background: isUploading ? '#555' : 'linear-gradient(135deg, #00A884, #00C896)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isUploading ? 'not-allowed' : 'pointer', flexShrink: 0,
                    boxShadow: isUploading ? 'none' : '0 4px 16px rgba(0,168,132,0.5)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isUploading
                    ? <div className="admin-spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    : <Send size={22} style={{ marginLeft: '2px' }} />
                  }
                </button>
              </div>
            </motion.div>
          )
        })(),
        document.body
      )}

      {/* Translating indicator */}
      <AnimatePresence>
        {isTranslating && (
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingLeft: '4px' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)' }}
                animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ delay: i * 0.13, duration: 0.55, repeat: Infinity }}
              />
            ))}
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', opacity: 0.8 }}>
              Translating message...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AttachmentMenu open={showAttach} onClose={() => setShowAttach(false)} onSelect={handleAttachmentSelect} />

      <AnimatePresence>
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji) => { addEmoji(emoji) }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isRecording || attachmentNotice || isUploading) && (
          <motion.div
            className="premium-composer-status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {isUploading ? (
              <>
                <div className="admin-spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--primary)' }}></div>
                <strong>{attachmentNotice || 'Uploading...'}</strong>
                <span>Please wait</span>
              </>
            ) : isRecording ? (
              <>
                <span className="premium-record-dot" />
                <strong>Recording voice note</strong>
                <span>{formattedRecordTime}</span>
                <button type="button" onClick={toggleRecording}><Square size={12} /> Stop</button>
              </>
            ) : (
              <>
                <Paperclip size={13} />
                <strong>{attachmentNotice}</strong>
                <span>Ready to attach</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>



      {/* Input bar wrapper with WhatsApp Pill Style */}
      <div
        className="chat-composer-bar"
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: darkMode ? '#2A3942' : '#F3EDF7',
          borderRadius: '28px',
          padding: '6px 16px',
          border: 'none',
          boxShadow: 'none',
          width: '100%',
          minHeight: '48px',
          overflow: isRecording ? 'hidden' : 'visible',
          position: 'relative',
          opacity: isUploading ? 0.6 : 1,
          pointerEvents: isUploading ? 'none' : 'auto'
        }}
      >
        <AnimatePresence>
          {isRecording ? (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ position: 'absolute', inset: 0, background: darkMode ? '#2A3942' : '#F3EDF7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10 }}
            >
              <button onClick={cancelRecording} type="button" style={{ background: 'transparent', border: 'none', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '8px' }}>
                <Trash2 size={20} strokeWidth={2} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1] }} 
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} 
                />
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formattedRecordTime}</span>
              </div>
              <button
                onClick={stopRecording}
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--primary)', border: 'none', cursor: 'pointer',
                  color: '#fff', padding: '8px', borderRadius: '50%',
                  boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                }}
              >
                <Send size={18} strokeWidth={2.5} style={{ marginLeft: '2px' }} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}
            >
              {/* Left icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px' }}>
                <button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: darkMode ? '#8696A0' : '#8B5CF6', padding: 0 }}
                  onClick={() => { setShowAttach(s => !s); setShowEmoji(false); }}
                  type="button"
                >
                  <Plus size={24} strokeWidth={2} />
                </button>
                {userPrefLang !== 'en' && (
                  <div style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 800, background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: '#fff', borderRadius: '8px', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
                    {shortPrefLang}
                  </div>
                )}
                <button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: darkMode ? '#8696A0' : '#8B5CF6', padding: 0 }}
                  onClick={() => { setShowEmoji(v => !v); setShowAttach(false); }}
                  type="button"
                >
                  <Smile size={24} strokeWidth={1.8} />
                </button>
              </div>

              {/* Textarea */}
              {useTransliteration ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <ReactTransliterate
                    value={text}
                    onChangeText={(t) => {
                      setText(t);
                      if (!socket || !activeChat || !user) return;
                      socket.emit('typing', { chatId: activeChat, userName: user.name });
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        socket.emit('stop_typing', { chatId: activeChat });
                      }, 2000);
                    }}
                    lang={transLang || 'hi'}
                    triggerKeys={[TriggerKeys.KEY_SPACE, TriggerKeys.KEY_ENTER, TriggerKeys.KEY_TAB]}
                    containerClassName="react-transliterate-wrapper"
                    containerStyles={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%' }}
                    renderComponent={(props) => (
                      <textarea
                        {...props}
                        ref={(el) => {
                          if (typeof props.ref === 'function') props.ref(el);
                          else if (props.ref) props.ref.current = el;
                          textRef.current = el;
                        }}
                        onKeyDown={(e) => {
                          if (props.onKeyDown) props.onKeyDown(e);
                          // If react-transliterate didn't intercept the Enter key (e.g. to select a suggestion), we can use it to send!
                          if (e.key === 'Enter' && !e.shiftKey && !e.defaultPrevented) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                          if (props.onBlur) props.onBlur();
                          setIsFocused(false);
                          if (socket && activeChat) {
                            socket.emit('stop_typing', { chatId: activeChat })
                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                          }
                        }}
                        placeholder={`Type phonetically for ${(transLang || 'hi').toUpperCase()}...`}
                        rows={1}
                        style={{
                          flex: 1, width: '100%', background: 'transparent', border: 'none', outline: 'none',
                          resize: 'none', fontSize: '15px', fontFamily: 'Inter, sans-serif',
                          fontWeight: 400, color: 'var(--text-primary)', lineHeight: '1.5',
                          minHeight: '22px', maxHeight: '100px', padding: '8px 0', margin: 0, alignSelf: 'center',
                          boxShadow: 'none',
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto'
                          e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                        }}
                      />
                    )}
                  />
                </div>
              ) : (
                <textarea
                  ref={textRef}
                  value={text}
                  onChange={handleTyping}
                  onKeyDown={handleKey}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    setIsFocused(false);
                    if (socket && activeChat) {
                      socket.emit('stop_typing', { chatId: activeChat })
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', fontSize: '15px', fontFamily: 'Inter, sans-serif',
                    fontWeight: 400, color: 'var(--text-primary)', lineHeight: '1.5',
                    minHeight: '22px', maxHeight: '100px', padding: '8px 0', alignSelf: 'center',
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                  }}
                />
              )}

              {/* Right icons */}
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
                {hasText ? (
                  <button
                    onClick={handleSend}
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: darkMode ? '#8696A0' : '#8B5CF6',
                      padding: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Send size={24} strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: darkMode ? '#8696A0' : '#8B5CF6',
                      padding: '4px'
                    }}
                    onClick={startRecording}
                    type="button"
                  >
                    <Mic size={24} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
