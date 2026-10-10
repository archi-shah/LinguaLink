import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, Languages, Lightbulb, Zap, Loader2 } from 'lucide-react'
import { aiAPI } from '../../api/client'

export default function AssistantPanel() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hello! I am your LinguaLink Assistant. I can help you translate difficult phrases, suggest polite responses, or answer any questions about the app. What can I do for you today?' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return
    const userText = input
    const newMessages = [...messages, { id: Date.now(), type: 'user', text: userText }]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)
    
    try {
      const res = await aiAPI.chat(messages, userText)
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: res?.text || res?.data?.text || 'No response received.' 
      }])
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: 'Sorry, I am having trouble connecting to my AI brain right now. Please try again later!' 
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const QuickStart = ({ icon: Icon, title, desc, onClick }) => (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{ 
        padding: '16px', 
        background: 'var(--bg-panel)', 
        border: '1px solid rgba(76, 116, 249, 0.15)', 
        borderRadius: '12px', 
        cursor: 'pointer', 
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, var(--primary), #8B5CF6)' }} />
      <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(76, 116, 249, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color="var(--primary)" />
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </motion.div>
  )

  return (
    <motion.div 
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', height: '100%' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4C74F9 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(76,116,249,0.3)', zIndex: 2, position: 'relative' }}>
            <Sparkles size={20} />
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '12px', background: 'linear-gradient(135deg, #4C74F9 0%, #8B5CF6 100%)', filter: 'blur(8px)', opacity: 0.6, zIndex: 1, animation: 'pulse 3s infinite' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.3px' }}>
            <span style={{ color: 'var(--text-primary)' }}>Lingua</span><span style={{ color: 'var(--primary)' }}>Link</span> AI
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
            <Zap size={12} fill="currentColor" /> Highly capable model ready
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', scrollBehavior: 'smooth' }}>
        
        {/* Welcome Grid */}
        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(76, 116, 249, 0.1)', borderRadius: '16px', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
                <Sparkles size={12} /> Suggestions
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>How can I help you today?</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
               <QuickStart icon={Languages} title="Translate Idioms" desc="Ask how to say 'break a leg' in French with literal meanings." onClick={() => setInput('How do I say "break a leg" in French and what does it literally mean?')} />
               <QuickStart icon={Lightbulb} title="Cultural Context" desc="Understand the bowing etiquette in Japan." onClick={() => setInput('Can you explain business bowing etiquette in Japan?')} />
               <QuickStart icon={Send} title="Draft a Reply" desc="Generate a polite refusal email." onClick={() => setInput('Help me draft a polite response turning down a business offer in Spanish.')} />
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 10, scale: 0.98 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              style={{ display: 'flex', gap: '12px', alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
            >
              {msg.type === 'bot' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #4C74F9 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 8px rgba(76,116,249,0.2)' }}>
                  <Sparkles size={16} />
                </div>
              )}
              <div style={{ 
                padding: '14px 18px', 
                borderRadius: '16px', 
                background: msg.type === 'user' ? 'linear-gradient(135deg, var(--primary) 0%, #3B5BDB 100%)' : 'var(--bg-panel)', 
                border: msg.type === 'user' ? 'none' : '1px solid var(--border-light)', 
                color: msg.type === 'user' ? '#fff' : 'var(--text-primary)', 
                fontSize: '14px', 
                lineHeight: '1.6', 
                borderTopRightRadius: msg.type === 'user' ? '4px' : '16px', 
                borderTopLeftRadius: msg.type === 'bot' ? '4px' : '16px', 
                boxShadow: msg.type === 'user' ? '0 4px 16px rgba(76,116,249,0.2)' : '0 2px 10px rgba(0,0,0,0.02)' 
              }}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #4C74F9 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 8px rgba(76,116,249,0.2)' }}>
                <Sparkles size={16} />
              </div>
              <div style={{ padding: '14px 18px', borderRadius: '16px', borderTopLeftRadius: '4px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Target */}
      <div style={{ padding: '16px 24px 24px', background: 'linear-gradient(to top, var(--bg-surface) 80%, transparent)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <input 
            type="text" 
            placeholder="Ask LinguaLink AI to translate, draft, or explain..." 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            disabled={isTyping}
            style={{ 
              width: '100%', 
              padding: '14px 20px', 
              paddingRight: '56px', 
              borderRadius: '24px', 
              border: '1px solid var(--border-light)', 
              background: 'var(--bg-panel)', 
              color: 'var(--text-primary)', 
              fontSize: '14px', 
              outline: 'none', 
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)', 
              transition: '0.3s', 
              ...(input && { borderColor: 'var(--primary)', boxShadow: '0 4px 16px rgba(76,116,249,0.1)' }) 
            }} 
          />
          <motion.button 
            onClick={handleSend}
            whileHover={!isTyping && input ? { scale: 1.05 } : {}}
            whileTap={!isTyping && input ? { scale: 0.95 } : {}}
            disabled={!input.trim() || isTyping}
            style={{ 
              position: 'absolute', 
              right: '6px', 
              width: '36px', 
              height: '36px', 
              borderRadius: '18px', 
              background: input && !isTyping ? 'linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)' : 'var(--bg-chat)', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: input && !isTyping ? '#fff' : 'var(--text-muted)', 
              cursor: input && !isTyping ? 'pointer' : 'default', 
              transition: 'all 0.3s',
              boxShadow: input && !isTyping ? '0 4px 12px rgba(76,116,249,0.3)' : 'none'
            }}
          >
            {isTyping ? <Loader2 size={16} className="spinner" /> : <Send size={16} style={{ marginLeft: '2px' }} />}
          </motion.button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px', fontWeight: 500 }}>
          LinguaLink AI can make mistakes. Consider verifying translation nuances.
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </motion.div>
  )
}
