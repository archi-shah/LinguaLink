import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Bot, Sparkles, Trash2, Send, Copy, Check, RefreshCw, Globe, MessageSquare, Zap, ShieldAlert, PenTool, ListTodo } from 'lucide-react'
import { aiAPI } from '../api/client'
import useStore from '../store/useStore'

// Markdown-lite renderer: bold, inline code, newlines
function renderText(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, li) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return (
      <span key={li}>
        {parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={pi}>{part.slice(2, -2)}</strong>
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={pi} style={{ background: 'rgba(124,58,237,0.12)', borderRadius: '4px', padding: '1px 5px', fontSize: '13px', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>
          return part
        })}
        {li < lines.length - 1 && <br />}
      </span>
    )
  })
}

function BotMessage({ text, isNew }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      {/* Bot avatar */}
      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
        <Sparkles size={15} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {renderText(text)}
        </div>
        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{ marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', borderRadius: '6px', transition: 'color 0.15s' }}
        >
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
    </div>
  )
}

const AI_SMART_ACTIONS = [
  { id: 'cultural', label: 'Cultural Check', icon: ShieldAlert, color: '#EC4899', desc: 'Check if my draft is culturally appropriate for the recipient.' },
  { id: 'reply', label: 'Ghostwriter', icon: PenTool, color: '#3B82F6', desc: 'Draft 3 strategic responses to the last message.' },
  { id: 'extract', label: 'Meeting Brief', icon: ListTodo, color: '#10B981', desc: 'Extract tasks and schedules from this chat.' }
]

export default function ChatbotPanel({ isOpen, onClose }) {
  const { activeChat, user } = useStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
  }, [messages, isLoading, isOpen, scrollToBottom])

  // Auto-grow textarea
  const handleInputChange = (e) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleSend = async (quickText = null, isSystemPrompt = false, hiddenPromptContext = "") => {
    const textToSend = (quickText || input).trim()
    if (!textToSend && !hiddenPromptContext) return
    if (isLoading) return

    setError(null)
    const userMsg = { id: Date.now(), role: 'user', text: textToSend }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    if (!isSystemPrompt) setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsLoading(true)

    try {
      const history = messages.map(m => ({ type: m.role, text: m.text }))
      const finalPrompt = hiddenPromptContext ? hiddenPromptContext + "\n\nUser Request: " + textToSend : textToSend
      
      const res = await aiAPI.chat(history, finalPrompt)
      const botText = res?.text || res?.message || 'Sorry, I could not generate a response.'

      setMessages([...newMessages, {
        id: Date.now() + 1,
        role: 'bot',
        text: botText,
        isNew: true,
      }])
    } catch (err) {
      console.error('Chatbot error:', err)
      setError(err.message || 'Connection failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSmartAction = (actionId) => {
    if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
      handleSend("Please select an active chat with some messages first to use Smart Actions.")
      return
    }

    const chatHistoryContext = activeChat.messages.map(m => 
      `${m.senderId === user?._id ? 'Me' : 'Recipient'}: ${m.content || '[Media]'}`
    ).slice(-15).join('\n')

    if (actionId === 'cultural') {
      const prompt = `You are a Cross-Cultural Mediator. Analyze the following chat history. The recipient might be from a different culture. Point out any potential cultural misunderstandings, faux pas, or tone issues in the recent messages. Be concise and professional.\n\nActive Chat History:\n${chatHistoryContext}`
      handleSend("Check cultural nuance in this chat.", true, prompt)
    } else if (actionId === 'reply') {
      const prompt = `You are an expert Ghostwriter. Read the following active chat history and draft 3 strategic responses I could send next. \n1. The Diplomat (soft, polite)\n2. The Negotiator (firm, professional)\n3. The Quick Acknowledge (short, clear).\nProvide ONLY the 3 drafts clearly labeled.\n\nActive Chat History:\n${chatHistoryContext}`
      handleSend("Draft 3 strategic responses to the last message.", true, prompt)
    } else if (actionId === 'extract') {
      const prompt = `You are an Executive Assistant. Read the following chat history and extract:\n1. Any agreed upon action items/tasks.\n2. Any proposed meeting times or schedules.\n3. Outstanding questions that need answering.\nIf none exist, say so politely.\n\nActive Chat History:\n${chatHistoryContext}`
      handleSend("Extract action items and schedules from this chat.", true, prompt)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  const retryLast = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
      setMessages(messages.slice(0, -1))
      handleSend(lastUser.text)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — click anywhere to close */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '440px', maxWidth: '100vw', zIndex: 901, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-medium)', boxShadow: '-20px 0 60px rgba(0,0,0,0.18)' }}
          >
            {/* ── Header ── */}
            <div style={{ position: 'relative', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-medium)', padding: '18px 20px', overflow: 'hidden' }}>
              {/* Gradient top bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7C3AED, #6366F1, #3B82F6)' }} />
              {/* Subtle glow */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(124,58,237,0.4)' }}>
                    <Sparkles size={20} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>LinguaLink AI</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Powered by Gemini · Online</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {messages.length > 0 && (
                    <button onClick={clearChat} title="Clear conversation" style={{ padding: '8px', borderRadius: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={17} />
                    </button>
                  )}
                  <button onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Messages ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-body, var(--bg-surface))' }}>

              {/* Welcome state */}
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '10px 0', gap: '20px' }}>
                  
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Bot size={32} color="var(--primary)" />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Context-Aware Assistant</h4>
                    <p style={{ margin: '8px auto 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '280px' }}>
                      I can read your active chat to help you navigate cross-cultural nuances and draft strategic replies.
                    </p>
                  </div>

                  {/* Smart Actions Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {AI_SMART_ACTIONS.map((action, i) => {
                      const Icon = action.icon
                      return (
                        <motion.button
                          key={action.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSmartAction(action.id)}
                          disabled={isLoading}
                          style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '14px', cursor: isLoading ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'border-color 0.2s', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = action.color}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={18} color={action.color} />
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{action.label}</span>
                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{action.desc}</span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Message list */}
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  {msg.role === 'bot' ? (
                    <BotMessage text={msg.text} isNew={msg.isNew} />
                  ) : (
                    <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', color: '#fff', fontSize: '14px', lineHeight: 1.6, boxShadow: '0 4px 16px rgba(124,58,237,0.3)', wordBreak: 'break-word' }}>
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={15} color="#fff" />
                  </div>
                  <div style={{ padding: '12px 18px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)' }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Thinking…</span>
                  </div>
                </motion.div>
              )}

              {/* Error state */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#EF4444', flex: 1 }}>⚠️ {error}</span>
                  <button onClick={retryLast} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Prompts (only when empty) ── */}
            {messages.length === 0 && (
              <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '5px 5px' }}>Requires active chat selection</span>
              </div>
            )}

            {/* ── Input Area ── */}
            <div style={{ padding: '12px 16px 16px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-medium)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)', borderRadius: '18px', padding: '8px 8px 8px 16px', transition: 'border-color 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything — translate, grammar, tone…"
                  rows={1}
                  style={{ flex: 1, minHeight: '40px', maxHeight: '120px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', padding: 0 }}
                />
                <motion.button
                  onClick={() => handleSend()}
                  whileHover={input.trim() && !isLoading ? { scale: 1.08 } : {}}
                  whileTap={input.trim() && !isLoading ? { scale: 0.94 } : {}}
                  disabled={!input.trim() || isLoading}
                  style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', background: input.trim() && !isLoading ? 'linear-gradient(135deg, #7C3AED, #6366F1)' : 'var(--bg-hover)', color: input.trim() && !isLoading ? '#fff' : 'var(--text-muted)', boxShadow: input.trim() && !isLoading ? '0 4px 14px rgba(124,58,237,0.4)' : 'none' }}
                >
                  {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </motion.button>
              </div>
              <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                Powered by Google Gemini · Press <kbd style={{ padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-medium)', fontSize: '10px', fontFamily: 'monospace' }}>Enter</kbd> to send
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
