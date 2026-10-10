import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'
import Sidebar from '../components/layout/Sidebar.jsx'
import ChatPanel from '../components/layout/ChatPanel.jsx'
import ChatWindow from '../components/layout/ChatWindow.jsx'
import StatusPanel from '../components/status/StatusPanel.jsx'
import SettingsPanel from '../components/layout/SettingsPanel.jsx'
import CommunityPanel from '../components/layout/CommunityPanel.jsx'
import StarredMessagesPanel from '../components/layout/StarredMessagesPanel.jsx'
import ChatbotPanel from '../components/ChatbotPanel.jsx'
import CallsPanel from '../components/layout/CallsPanel.jsx'
import useStore from '../store/useStore.js'

/* ── Privacy mode banner ── */
function PrivacyBanner() {
  return (
    <motion.div
      style={{
        position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 50, display: 'flex', alignItems: 'center', gap: '8px',
        borderRadius: '999px', padding: '8px 20px',
        background: '#FFFFFF',
        border: '1px solid rgba(244,63,94,0.28)',
        boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
      }}
      initial={{ y: -44, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -44, opacity: 0 }}
    >
      <Shield size={14} style={{ color: '#F43F5E' }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#F43F5E', fontFamily: 'Inter, sans-serif' }}>
        Privacy Mode Active — Screen blanking enabled
      </span>
    </motion.div>
  )
}

/* ── Deleted PlaceholderPanel ── */

/* ── LOGIC BLOCK: MAIN CHAT PAGE ── */
// This is the primary screen users see after logging in.
// It acts like a container that holds the Sidebar (left) and the main content area (right).
// Depending on what you click in the Sidebar (e.g. Chats, Status, Settings), 
// it swaps out the panels dynamically.
export default function ChatPage() {
  const { activeSidebar, privacyMode, setActiveSidebar, activeChat, mobileSidebarOpen, setMobileSidebarOpen } = useStore()
  const [chatbotOpen, setChatbotOpen] = useState(false)

  // Open chatbot drawer when Bot icon is clicked
  const handleSidebarClick = (id) => {
    if (id === 'chatbot') { setChatbotOpen(true); return }
    setActiveSidebar(id)
  }

  const renderLeftPanel = () => {
    if (activeSidebar === 'chats')   return <ChatPanel />
    if (activeSidebar === 'calls')   return <CallsPanel />
    if (activeSidebar === 'status')  return <StatusPanel />
    if (activeSidebar === 'starred') return <StarredMessagesPanel />
    return null
  }

  const renderMain = () => {
    if (activeSidebar === 'settings')  return <SettingsPanel />
    if (activeSidebar === 'community') return <CommunityPanel />
    return <ChatWindow />
  }

  const isMainActive = !!activeChat || activeSidebar === 'settings'

  return (
    <div className={`app-container ${isMainActive ? 'main-active' : ''}`} style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(2px)' }}
            className="mobile-only"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {privacyMode && <PrivacyBanner />}
      </AnimatePresence>

      {/* 1. Master Nav Rail */}
      <Sidebar onChatbotOpen={() => setChatbotOpen(true)} />

      {/* 2. Secondary Panel */}
      {renderLeftPanel()}

      {/* 3. Main Operational Area */}
      {renderMain()}

      {/* 4. AI Chatbot Drawer */}
      <ChatbotPanel isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </div>
  )
}
