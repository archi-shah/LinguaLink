import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, KeyRound, Mail, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react'
import useStore from '../store/useStore'
import '../admin.css' // Import the theme tokens

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  
  const [step, setStep] = useState('login')
  const [errorMsg, setErrorMsg] = useState('')
  
  const { login, verifyOTP, loading, darkMode, setDarkMode } = useStore()
  const navigate = useNavigate()

  // Ensure login screen starts in light mode by default if user hasn't toggled yet
  useEffect(() => {
    if (darkMode === undefined) {
      setDarkMode(false);
    }
  }, [darkMode, setDarkMode]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    
    // Read directly from DOM to bypass chrome autofill bug
    const payloadIdentifier = e.target.elements.identifierInput.value
    const payloadPassword = e.target.elements.passwordInput.value

    if (!payloadIdentifier || !payloadPassword) {
      setErrorMsg('Identifier and password required.')
      return
    }
    
    try {
      const res = await login(payloadIdentifier, payloadPassword)
      if (res.requireOtp) {
        setStep('otp')
      } else {
        checkRoleAndRedirect(res.user)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Unauthorized.')
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (!otp || otp.length < 6) {
      setErrorMsg('Enter the 6-digit OTP.')
      return
    }
    
    try {
      const res = await verifyOTP(identifier, otp)
      checkRoleAndRedirect(res.user)
    } catch (err) {
      setErrorMsg(err.message || 'OTP Verification failed.')
    }
  }

  const checkRoleAndRedirect = (userObj) => {
    if (userObj?.role === 'admin') {
      navigate('/admin') // Success!
    } else {
      setErrorMsg('ACCESS DENIED: Lacks Administrator privileges.')
      useStore.getState().logout()
      setStep('login')
      setPassword('')
      setOtp('')
    }
  }

  return (
    <div className={`ll-admin-layout ${darkMode ? 'dark' : ''}`} style={{ justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Dark/Light mode toggle */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: 'absolute', top: 24, right: 24, zIndex: 10,
          background: 'var(--ll-bg-elem)', border: '1px solid var(--ll-border)',
          padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--ll-text-2)', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: '13px',
          boxShadow: 'var(--ll-shadow-sm)'
        }}
      >
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        {darkMode ? 'Light Mode' : 'Dark Mode'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--ll-bg-card)',
          border: '1px solid var(--ll-border)',
          borderRadius: '24px',
          boxShadow: 'var(--ll-shadow-md)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ height: '3px', background: 'var(--ll-gradient)' }} />
        
        <div style={{ padding: '40px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '36px', textAlign: 'center' }}>
            <div style={{ padding: '4px' }}>
              <img src="/features/logo.PNG" alt="LinguaLink" style={{ width: '48px', height: '48px', objectFit: 'contain', filter: darkMode ? 'drop-shadow(0 0 12px rgba(107,92,246,0.5))' : 'none' }} />
            </div>
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: 'var(--ll-text-1)', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>LinguaLink Admin</h1>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ll-text-3)', fontWeight: 500 }}>Sign in to access the management console</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLoginSubmit}
              >
                {errorMsg && (
                  <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', color: 'var(--ll-red)', fontSize: '13px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <ShieldAlert size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.4 }}>{errorMsg}</span>
                  </div>
                )}
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ll-text-2)', marginBottom: '8px' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--ll-text-3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      autoFocus
                      required
                      name="identifierInput"
                      type="text" 
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="admin@lingualink.com"
                      style={{ width: '100%', background: 'var(--ll-bg-elem)', border: '1.5px solid var(--ll-border-md)', borderRadius: '12px', color: 'var(--ll-text-1)', fontSize: '14px', padding: '12px 16px 12px 42px', outline: 'none', transition: 'all 0.2s', fontFamily: 'Inter' }}
                      onFocus={e => e.target.style.borderColor = 'var(--ll-blue)'}
                      onBlur={e => e.target.style.borderColor = 'var(--ll-border-md)'}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ll-text-2)', marginBottom: '8px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} color="var(--ll-text-3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      required
                      name="passwordInput"
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      style={{ width: '100%', background: 'var(--ll-bg-elem)', border: '1.5px solid var(--ll-border-md)', borderRadius: '12px', color: 'var(--ll-text-1)', fontSize: '14px', padding: '12px 16px 12px 42px', outline: 'none', transition: 'all 0.2s', fontFamily: 'Inter' }}
                      onFocus={e => e.target.style.borderColor = 'var(--ll-blue)'}
                      onBlur={e => e.target.style.borderColor = 'var(--ll-border-md)'}
                    />
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  type="submit"
                  style={{ width: '100%', background: 'var(--ll-gradient)', color: '#fff', border: 'none', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--ll-glow-sm)' }}
                >
                  {loading ? 'Authenticating...' : 'Sign In securely'}
                  {!loading && <ArrowRight size={16} />}
                </motion.button>
              </motion.form>

            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleOtpSubmit}
              >
                {errorMsg && (
                  <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', color: 'var(--ll-red)', fontSize: '13px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={16} /> {errorMsg}
                  </div>
                )}
                
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--ll-blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--ll-blue)' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--ll-text-1)', fontSize: '18px', fontWeight: 700, fontFamily: 'Outfit' }}>Verify your identity</h3>
                  <p style={{ margin: 0, color: 'var(--ll-text-2)', fontSize: '13px', lineHeight: 1.5 }}>
                    Enter the 6-digit verification code sent to <br/><strong style={{ color: 'var(--ll-text-1)' }}>{identifier}</strong>
                  </p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <input 
                    autoFocus
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    style={{ width: '100%', background: 'var(--ll-bg-elem)', border: '1.5px solid var(--ll-border-md)', borderRadius: '16px', color: 'var(--ll-text-1)', fontSize: '32px', padding: '16px', outline: 'none', transition: 'all 0.2s', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.4em' }}
                    onFocus={e => e.target.style.borderColor = 'var(--ll-blue)'}
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  type="submit"
                  style={{ width: '100%', background: 'var(--ll-gradient)', color: '#fff', border: 'none', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--ll-glow-sm)' }}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                  {!loading && <ArrowRight size={16} />}
                </motion.button>
                
                <button type="button" onClick={() => setStep('login')} disabled={loading} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--ll-text-3)', fontSize: '13px', padding: '16px 0 0', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Back to login
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
