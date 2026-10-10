import React, { useEffect } from 'react'
// React Router DOM is used to navigate between different pages without reloading the browser
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, AlertTriangle, Info, Bell } from 'lucide-react'
import LandingPage from './pages/LandingPage.jsx'
import AuthPage        from './pages/AuthPage.jsx'
import ChatPage        from './pages/ChatPage.jsx'
import AdminDashboard  from './pages/AdminDashboard.jsx'
import AdminLogin      from './pages/AdminLogin.jsx'
import useStore        from './store/useStore.js'

import CallProvider       from './components/CallProvider.jsx'
import GroupCallProvider  from './components/GroupCallProvider.jsx'

// App is the main component that wraps the entire frontend application.
export default function App() {
  // We grab the user state and a few functions from our global Zustand store.
  const { user, getCurrentUser, socket, isCheckingAuth } = useStore()
  const [announcement, setAnnouncement] = React.useState(null)

  // System Broadcast Listener
  useEffect(() => {
    if (!socket) return;
    const handleAnnouncement = (data) => {
      setAnnouncement(data);
      // Auto dismiss after 10s
      setTimeout(() => setAnnouncement(null), 10000);
    };
    socket.on('system_announcement', handleAnnouncement);
    return () => socket.off('system_announcement', handleAnnouncement);
  }, [socket]);

  // Auto-login logic (useEffect runs when the app first loads)
  useEffect(() => {
    // Check if the user previously logged in by looking for a token in the browser's localStorage
    const token = localStorage.getItem('authToken')
    if (token && token !== 'demo-session-token' && !user) {
      // If we find a token, ask the backend if it's still valid
      getCurrentUser().catch(() => {
        // Token invalid/expired — clear it silently
        localStorage.removeItem('authToken')
        useStore.setState({ isCheckingAuth: false })
      })
    } else if (!token) {
      // No token — no need to wait, stop the spinner immediately
      useStore.setState({ isCheckingAuth: false })
    }
  }, []) // run once on mount

  if (isCheckingAuth) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060913' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="admin-spinner" style={{ width: 40, height: 40, borderTopColor: '#4C74F9', margin: '0 auto 12px' }}></div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Verifying session…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <GroupCallProvider>
        <CallProvider>
          {/* Routes defines all the different pages in our app */}
          <Routes>
            {/* When the URL is '/', show the LandingPage */}
            <Route path="/"     element={<LandingPage />} />
            
            {/* Protect the /auth route. If a user is already logged in, redirect them away from the login page. */}
            <Route path="/auth" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/chat'} /> : <AuthPage />} />
            
            {/* Protect the /chat route. If the user is NOT logged in, redirect them to /auth. */}
            <Route path="/chat" element={
              !user ? <Navigate to="/auth" /> :
              user.isBanned ? (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060913', flexDirection: 'column' }}>
                   <AlertTriangle color="#EF4444" size={64} style={{ marginBottom: 16 }} />
                   <h1 style={{ color: '#EF4444', fontFamily: 'Outfit', fontWeight: 800 }}>Admin Blocked</h1>
                   <p style={{ color: 'var(--text-muted)' }}>You have been blocked by an administrator and cannot access LinguaLink.</p>
                </div>
              ) :
              user.role === 'admin' ? <Navigate to="/admin" /> :
              <ChatPage />
            } />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <AdminLogin />} />
            <Route path="*"     element={<Navigate to="/" />} />
          </Routes>
        </CallProvider>
      </GroupCallProvider>

      {/* --- LOGIC BLOCK: GLOBAL ALERTS --- */}
      {/* Global Broadcast Popup */}
      {/* AnimatePresence is from framer-motion. It allows React to animate components 
          as they appear (mount) and disappear (unmount) from the screen. */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 30, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: -50, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed', top: 0, left: '50%', zIndex: 99999,
              background: announcement.severity === 'important' ? '#EF4444' : announcement.severity === 'warning' ? '#F59E0B' : '#3B82F6',
              color: 'white', padding: '16px 24px', borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)', minWidth: 320, maxWidth: 500,
              display: 'flex', alignItems: 'flex-start', gap: 16, cursor: 'pointer'
            }}
            onClick={() => setAnnouncement(null)}
          >
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 }}>
              {announcement.severity === 'important' ? <Rocket size={24} /> : announcement.severity === 'warning' ? <AlertTriangle size={24} /> : <Info size={24} />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, opacity: 0.9 }}>
                System Announcement
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.4 }}>{announcement.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
