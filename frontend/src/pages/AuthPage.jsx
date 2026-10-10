// AuthPage.jsx — Premium centered glass card authentication
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Globe, Phone, Sun, Moon, ShieldCheck, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import useStore from '../store/useStore.js'
import PhoneField from '../components/auth/PhoneField.jsx'
import '../auth.css'

// ── Input Field Component ──
function Field({ label, type = 'text', value, onChange, id, icon: Icon, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const isPw      = type === 'password'
  const inputType = isPw ? (showPw ? 'text' : 'password') : type

  return (
    <div className="auth-field">
      {label && <label className="auth-label" htmlFor={id}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.2s', zIndex: 1 }}>
            <Icon size={17} strokeWidth={1.8} />
          </div>
        )}
        <input
          id={id} type={inputType} value={value} onChange={onChange}
          placeholder={placeholder} autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="input-glass"
          style={{ paddingLeft: Icon ? '42px' : '16px', paddingRight: isPw ? '42px' : '16px' }}
          autoComplete="off"
        />
        {isPw && (
          <button type="button" onClick={() => setShowPw(s => !s)}
            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {showPw ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Select Field ──
function SelectField({ label, value, onChange, id, icon: Icon, options }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="auth-field">
      {label && <label className="auth-label" htmlFor={id}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.2s', zIndex: 2 }}>
            <Icon size={17} strokeWidth={1.8} />
          </div>
        )}
        <select id={id} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="input-glass"
          style={{ paddingLeft: Icon ? '42px' : '16px', paddingRight: '40px', cursor: 'pointer', appearance: 'none' }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▼</div>
      </div>
    </div>
  )
}

// ── Password Strength Meter ──
function StrengthMeter({ password }) {
  if (!password) return null
  let score = 0
  if (password.length > 5) score++
  if (password.length > 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  const cls = score >= 4 ? 'epic' : score >= 3 ? 'strong' : score >= 2 ? 'fair' : 'weak'
  const lbl = score >= 4 ? 'Excellent' : score >= 3 ? 'Good' : score >= 2 ? 'Fair' : 'Weak'
  return (
    <div style={{ marginBottom: '16px', marginTop: '-8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
        {[1,2,3,4].map(n => <div key={n} className={`strength-bar ${score >= n ? cls : ''}`} />)}
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
        Strength: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lbl}</span>
      </div>
    </div>
  )
}

// ── 6-Box OTP Input (Fixed) ──
function OtpInput({ value, onChange, onResend, loading, destination }) {
  const NUM = 6
  const refs = Array.from({ length: NUM }, () => useRef(null))
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Build a clean 6-char array (digits only, padded)
  const digits = Array.from({ length: NUM }, (_, i) => (value[i] || ''))

  const focusIdx = (i) => {
    const el = refs[i]?.current
    if (!el) return
    el.focus()
    // Always put caret at end
    requestAnimationFrame(() => {
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  const handleClick = (i) => (e) => {
    e.preventDefault()
    focusIdx(i)
  }

  const handleKeyDown = (i) => (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) {
        const next = [...digits]; next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        const next = [...digits]; next[i - 1] = ''
        onChange(next.join(''))
        focusIdx(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault(); focusIdx(i - 1)
    } else if (e.key === 'ArrowRight' && i < NUM - 1) {
      e.preventDefault(); focusIdx(i + 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const handleChange = (i) => (e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return
    const next = [...digits]
    // Handle typing multiple digits (paste via keyboard)
    let cursor = i
    for (const ch of val) {
      if (cursor >= NUM) break
      next[cursor] = ch
      cursor++
    }
    onChange(next.join(''))
    focusIdx(Math.min(cursor, NUM - 1))
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, NUM)
    const next = Array.from({ length: NUM }, (_, i) => pasted[i] || '')
    onChange(next.join(''))
    focusIdx(Math.min(pasted.length, NUM - 1))
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Info Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '24px', padding: '14px 16px',
        background: 'rgba(124,58,237,0.07)',
        borderRadius: '14px', border: '1px solid rgba(124,58,237,0.2)'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.12))',
          border: '1px solid rgba(124,58,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ShieldCheck size={20} color="var(--primary)" strokeWidth={1.8} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Check your inbox</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            We sent a 6-digit code to <strong style={{ color: 'var(--primary)' }}>{destination}</strong>
          </p>
        </div>
      </div>

      {/* OTP Boxes */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
        {digits.map((d, i) => {
          const isActive = d || focusedIndex === i
          return (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            autoFocus={i === 0}
            onClick={handleClick(i)}
            onFocus={(e) => {
              setFocusedIndex(i)
              handleClick(i)(e)
            }}
            onBlur={() => setFocusedIndex(-1)}
            onChange={handleChange(i)}
            onKeyDown={handleKeyDown(i)}
            onPaste={handlePaste}
            autoComplete="one-time-code"
            style={{
              width: '52px', height: '58px',
              textAlign: 'center',
              fontSize: '24px', fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.02em',
              borderRadius: '14px',
              outline: 'none',
              border: isActive ? '2px solid var(--primary)' : '2px solid var(--border-medium)',
              background: isActive ? 'rgba(124,58,237,0.08)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              boxShadow: isActive ? '0 0 0 3px rgba(124,58,237,0.15), 0 4px 12px rgba(124,58,237,0.08)' : 'none',
              transition: 'all 0.18s ease',
              caretColor: 'transparent', // Hide blinking cursor inside box
              cursor: 'default',
            }}
          />
        )})}
      </div>

      {/* Timer and Resend */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          style={{
            background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--primary)', fontSize: '13px', fontWeight: 600,
            opacity: loading ? 0.5 : 1, padding: '4px 8px', borderRadius: '8px',
          }}
        >
          Didn&apos;t receive it? <span style={{ textDecoration: 'underline' }}>Resend code</span>
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════
// MAIN AUTH PAGE
// ══════════════════════════════
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

function AuthContent() {
  const location = useLocation()
  const [viewState,  setViewState]  = useState(() => location.state?.tab || 'login')

  useEffect(() => {
    if (location.state?.tab) {
      setViewState(location.state.tab)
    }
  }, [location.state?.tab])
  const [authMethod, setAuthMethod] = useState(() => localStorage.getItem('preferredAuthMethod') || null)
  const [login,  setLogin]  = useState({ identifier: '', password: '' })
  const [loginPhone, setLoginPhone] = useState('+91 ')
  const [reg,    setReg]    = useState({ name: '', identifier: '', password: '', confirmPassword: '', language: 'en' })
  const [regPhone, setRegPhone] = useState('+91 ')
  const [errors, setErrors] = useState({})
  const [otpSent,  setOtpSent]  = useState(false)
  const [otpCode,  setOtpCode]  = useState('')
  const [devOtp, setDevOtp] = useState('')
  // Forgot password flow: 'idle' | 'enterIdentifier' | 'enterOtp' | 'newPassword' | 'done'
  const [fpStep,       setFpStep]       = useState('idle')
  const [fpIdentifier, setFpIdentifier] = useState('')
  const [fpOtp,        setFpOtp]        = useState('')
  const [fpNewPass,    setFpNewPass]    = useState('')
  const [fpConfirm,    setFpConfirm]    = useState('')
  const [fpErrors,     setFpErrors]     = useState({})
  


  const resetMethod = () => {
    setAuthMethod(null)
    setOtpSent(false)
    setOtpCode('')
    setErrors({})
    setLogin({ identifier: '', password: '' })
    setLoginPhone('+91 ')
    setReg({ name: '', identifier: '', password: '', confirmPassword: '', language: 'en' })
    setRegPhone('+91 ')
    setFpStep('idle')
    setFpIdentifier('')
    setFpOtp('')
    setFpNewPass('')
    setFpConfirm('')
    setFpErrors({})
  }

  const navigate = useNavigate()
  const { user, login: loginFn, register: registerFn, sendOTP, verifyOTP, googleLogin, forgotPassword: forgotFn, resetPassword: resetFn, loading, darkMode, setDarkMode } = useStore()

  // Google Login hook for custom button
  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      await googleLogin(tokenResponse.credential || tokenResponse.access_token);
      navigate('/chat');
    } catch (err) {
      setErrors({ general: 'Google Login failed.' });
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setErrors({ general: 'Google Login was canceled or failed.' })
  });

  // Auto-submit OTP when all 6 digits filled (login/register)
  useEffect(() => {
    if (otpSent && otpCode.replace(/\D/g, '').length === 6) {
      const id = authMethod === 'phone'
        ? (viewState === 'login' ? loginPhone.trim() : regPhone.trim())
        : (viewState === 'login' ? login.identifier : reg.identifier)
      
      verifyOTP(id, otpCode.replace(/\D/g, '')).catch(err => setErrors({ general: err.message || 'Verification failed.' }))
    }
  }, [otpCode, otpSent])

  // Auto-submit forgot-password OTP when 6 digits filled
  useEffect(() => {
    if (fpStep === 'enterOtp' && fpOtp.replace(/\D/g, '').length === 6) {
      setFpStep('newPassword')
    }
  }, [fpOtp, fpStep])

  useEffect(() => { if (user) navigate('/chat') }, [user, navigate])

  const switchView = (v) => {
    setViewState(v)
    setErrors({})
    setOtpSent(false)
    setOtpCode('')
    setDevOtp('')
    setDevOtp('')
    if (v === 'login') {
      setAuthMethod(localStorage.getItem('preferredAuthMethod') || null)
    } else {
      setAuthMethod(null) // always show both options for register
    }
  }



  const handleLogin = async (e) => {
    e.preventDefault(); setErrors({})
    const effectiveId = authMethod === 'phone' ? loginPhone.trim() : login.identifier
    if (!otpSent) {
      if (!effectiveId || !login.password) { setErrors({ general: 'Please fill in all fields.' }); return }
      if (authMethod === 'phone') {
        const numPart = loginPhone.replace(/^\+\d+\s*/, '').replace(/\D/g, '')
        if (numPart.length < 7) { setErrors({ identifier: 'Please enter a valid phone number.' }); return }
      }
      try {
        const res = await loginFn(effectiveId, login.password)
        if (res?.requireOtp) setOtpSent(true)
      }
      catch (err) { setErrors({ general: err.message || 'Login failed.' }) }
    } else {
      try { 
        await verifyOTP(effectiveId, otpCode.replace(/\s/g, ''))
        localStorage.setItem('preferredAuthMethod', authMethod)
      }
      catch (err) { setErrors({ general: err.message || 'Verification failed.' }) }
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault(); setErrors({})
    const effectiveId = authMethod === 'phone' ? regPhone.trim() : reg.identifier
    if (!otpSent) {
      const errs = {}
      if (!reg.name.trim()) errs.name = 'Full name is required'
      if (authMethod === 'phone') {
        const numPart = regPhone.replace(/^\+\d+\s*/, '').replace(/\D/g, '')
        if (numPart.length < 7) errs.identifier = 'Please enter a valid phone number.'
      } else {
        if (!reg.identifier.trim()) errs.identifier = 'Email is required'
      }
      if (reg.password.length < 6) errs.password = 'Password must be at least 6 characters'
      if (reg.password !== reg.confirmPassword) errs.confirmPassword = 'Passwords do not match'
      if (Object.keys(errs).length) { setErrors(errs); return }
      try {
        const res = await registerFn(reg.name, effectiveId, reg.password, reg.confirmPassword, reg.language)
        if (res?.requireOtp) setOtpSent(true)
      }
      catch (err) { setErrors({ general: err.message || 'Registration failed.' }) }
    } else {
      try { 
        await verifyOTP(effectiveId, otpCode.replace(/\s/g, ''))
        localStorage.setItem('preferredAuthMethod', authMethod)
      }
      catch (err) { setErrors({ general: err.message || 'Verification failed.' }) }
    }
  }

  // ── Forgot Password handlers ──
  const handleForgotSend = async (e) => {
    e.preventDefault(); setFpErrors({})
    if (!fpIdentifier.trim()) { setFpErrors({ id: 'Please enter your email or phone number.' }); return }
    try {
      await forgotFn(fpIdentifier.trim())
      setFpStep('enterOtp')
    } catch (err) { setFpErrors({ id: err.message || 'Failed to send reset code.' }) }
  }

  const handleForgotReset = async (e) => {
    e.preventDefault(); setFpErrors({})
    if (fpNewPass.length < 6) { setFpErrors({ pw: 'Password must be at least 6 characters.' }); return }
    if (fpNewPass !== fpConfirm) { setFpErrors({ pw: 'Passwords do not match.' }); return }
    try {
      await resetFn(fpIdentifier.trim(), fpOtp, fpNewPass)
      setFpStep('done')
    } catch (err) { setFpErrors({ pw: err.message || 'Reset failed.' }) }
  }

  const langs = [
    { value: 'en', label: 'English' },
    { value: 'af', label: 'Afrikaans' },
    { value: 'sq', label: 'Albanian' },
    { value: 'am', label: 'Amharic' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hy', label: 'Armenian' },
    { value: 'az', label: 'Azerbaijani' },
    { value: 'eu', label: 'Basque' },
    { value: 'be', label: 'Belarusian' },
    { value: 'bn', label: 'Bengali' },
    { value: 'bs', label: 'Bosnian' },
    { value: 'bg', label: 'Bulgarian' },
    { value: 'ca', label: 'Catalan' },
    { value: 'ceb', label: 'Cebuano' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'zh-TW', label: 'Chinese (Traditional)' },
    { value: 'co', label: 'Corsican' },
    { value: 'hr', label: 'Croatian' },
    { value: 'cs', label: 'Czech' },
    { value: 'da', label: 'Danish' },
    { value: 'nl', label: 'Dutch' },
    { value: 'eo', label: 'Esperanto' },
    { value: 'et', label: 'Estonian' },
    { value: 'fi', label: 'Finnish' },
    { value: 'fr', label: 'French' },
    { value: 'fy', label: 'Frisian' },
    { value: 'gl', label: 'Galician' },
    { value: 'ka', label: 'Georgian' },
    { value: 'de', label: 'German' },
    { value: 'el', label: 'Greek' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'ht', label: 'Haitian Creole' },
    { value: 'ha', label: 'Hausa' },
    { value: 'haw', label: 'Hawaiian' },
    { value: 'he', label: 'Hebrew' },
    { value: 'hi', label: 'Hindi' },
    { value: 'hmn', label: 'Hmong' },
    { value: 'hu', label: 'Hungarian' },
    { value: 'is', label: 'Icelandic' },
    { value: 'ig', label: 'Igbo' },
    { value: 'id', label: 'Indonesian' },
    { value: 'ga', label: 'Irish' },
    { value: 'it', label: 'Italian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'jv', label: 'Javanese' },
    { value: 'kn', label: 'Kannada' },
    { value: 'kk', label: 'Kazakh' },
    { value: 'km', label: 'Khmer' },
    { value: 'ko', label: 'Korean' },
    { value: 'ku', label: 'Kurdish' },
    { value: 'ky', label: 'Kyrgyz' },
    { value: 'lo', label: 'Lao' },
    { value: 'la', label: 'Latin' },
    { value: 'lv', label: 'Latvian' },
    { value: 'lt', label: 'Lithuanian' },
    { value: 'lb', label: 'Luxembourgish' },
    { value: 'mk', label: 'Macedonian' },
    { value: 'mg', label: 'Malagasy' },
    { value: 'ms', label: 'Malay' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'mt', label: 'Maltese' },
    { value: 'mi', label: 'Maori' },
    { value: 'mr', label: 'Marathi' },
    { value: 'mn', label: 'Mongolian' },
    { value: 'my', label: 'Myanmar (Burmese)' },
    { value: 'ne', label: 'Nepali' },
    { value: 'no', label: 'Norwegian' },
    { value: 'ny', label: 'Nyanja (Chichewa)' },
    { value: 'ps', label: 'Pashto' },
    { value: 'fa', label: 'Persian' },
    { value: 'pl', label: 'Polish' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'pa', label: 'Punjabi' },
    { value: 'ro', label: 'Romanian' },
    { value: 'ru', label: 'Russian' },
    { value: 'sm', label: 'Samoan' },
    { value: 'gd', label: 'Scots Gaelic' },
    { value: 'sr', label: 'Serbian' },
    { value: 'st', label: 'Sesotho' },
    { value: 'sn', label: 'Shona' },
    { value: 'sd', label: 'Sindhi' },
    { value: 'si', label: 'Sinhala' },
    { value: 'sk', label: 'Slovak' },
    { value: 'sl', label: 'Slovenian' },
    { value: 'so', label: 'Somali' },
    { value: 'es', label: 'Spanish' },
    { value: 'su', label: 'Sundanese' },
    { value: 'sw', label: 'Swahili' },
    { value: 'sv', label: 'Swedish' },
    { value: 'tg', label: 'Tajik' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
    { value: 'th', label: 'Thai' },
    { value: 'tr', label: 'Turkish' },
    { value: 'uk', label: 'Ukrainian' },
    { value: 'ur', label: 'Urdu' },
    { value: 'uz', label: 'Uzbek' },
    { value: 'vi', label: 'Vietnamese' },
    { value: 'cy', label: 'Welsh' },
    { value: 'xh', label: 'Xhosa' },
    { value: 'yi', label: 'Yiddish' },
    { value: 'yo', label: 'Yoruba' },
    { value: 'zu', label: 'Zulu' }
  ]

  const LANGUAGE_BUBBLES = [
    { text: 'Bonjour', left: '5%', delay: '-7s', dur: '18s', tone: 'violet', size: 'lg' },
    { text: 'Hola', left: '12%', delay: '-1s', dur: '21s', tone: 'violet', size: 'md' },
    { text: 'こんにちは', left: '19%', delay: '-12s', dur: '23s', tone: 'blue', size: 'md' },
    { text: 'مرحبا', left: '28%', delay: '-4s', dur: '19s', tone: 'teal', size: 'sm' },
    { text: 'Ciao', left: '36%', delay: '-15s', dur: '22s', tone: 'indigo', size: 'sm' },
    { text: 'नमस्ते', left: '47%', delay: '-9s', dur: '20s', tone: 'cyan', size: 'md' },
    { text: 'Hallo', left: '58%', delay: '-2s', dur: '24s', tone: 'violet', size: 'sm' },
    { text: 'Jambo', left: '68%', delay: '-13s', dur: '18s', tone: 'teal', size: 'md' },
    { text: 'Ahoj', left: '78%', delay: '-6s', dur: '22s', tone: 'cyan', size: 'sm' },
    { text: 'Salam', left: '88%', delay: '-16s', dur: '20s', tone: 'blue', size: 'lg' },
    { text: 'Xin chao', left: '72%', delay: '-1s', dur: '26s', tone: 'violet', size: 'lg' },
    { text: 'Hello', left: '42%', delay: '-19s', dur: '25s', tone: 'cyan', size: 'sm' },
  ]

  return (
    <div className="auth-page">
      {/* Floating language bubbles */}
      <div className="auth-bubble-field" aria-hidden="true">
        {LANGUAGE_BUBBLES.map((bubble, i) => (
          <span key={`${bubble.text}-${i}`} className={`auth-language-bubble ${bubble.tone} ${bubble.size}`} style={{
            left: bubble.left,
            animationDuration: bubble.dur,
            animationDelay: bubble.delay,
          }}>
            {bubble.text}
          </span>
        ))}
      </div>

      {/* Background texture */}
      <div className="auth-grid" />

      <div className="auth-ambient" aria-hidden="true" />
      {/* Back button */}
      <motion.button className="auth-back-btn" onClick={() => navigate('/')} whileHover={{ x: -2 }}>
        <ArrowLeft size={15} strokeWidth={2.5} />
        Back to home
      </motion.button>

      {/* Dark mode toggle */}
      <motion.button className="auth-toggle" onClick={() => setDarkMode(!darkMode)} whileHover={{ scale: 1.05 }}>
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </motion.button>

      {/* ── Main Glass Card ── */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="auth-logo-row">
          <div className="auth-logo-mark" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/features/logo.PNG" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="auth-logo-text"><span style={{ color: 'var(--text-primary)' }}>Lingua</span><span style={{ color: 'var(--primary)' }}>Link</span></span>
          <p className="auth-subtitle">
            {viewState === 'login' ? 'Sign in to continue your conversations.' : 'Create your account and start translating naturally.'}
          </p>
        </div>

        {/* View switcher tabs */}
        <div className="auth-tab-bar">
          {['login', 'register'].map(v => (
            <button key={v} className={`auth-tab ${viewState === v ? 'active' : ''}`}
              onClick={() => switchView(v)}>
              {v === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── METHOD PICKER (shown when no method chosen) ── */}
          {!authMethod && (
            <motion.div key="picker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
              <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '18px', fontWeight: 500 }}>
                How would you like to {viewState === 'login' ? 'sign in' : 'create your account'}?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Phone Option Card */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthMethod('phone')}
                  style={{
                    width: '100%', padding: '18px 20px',
                    background: 'var(--bg-panel)',
                    border: '1.5px solid var(--border-light)',
                    borderRadius: '16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    textAlign: 'left', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-panel)' }}
                >
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={22} color="var(--primary)" strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Continue with Phone</p>
                    <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>We'll send a 6-digit OTP to your number</p>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '18px', opacity: 0.5 }}>›</div>
                </motion.button>

                {/* Email Option Card */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthMethod('email')}
                  style={{
                    width: '100%', padding: '18px 20px',
                    background: 'var(--bg-panel)',
                    border: '1.5px solid var(--border-light)',
                    borderRadius: '16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    textAlign: 'left', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-panel)' }}
                >
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={22} color="#3B82F6" strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Continue with Email</p>
                    <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>Use your email address and password</p>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '18px', opacity: 0.5 }}>›</div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── LOGIN FORM (phone or email — whichever was chosen) ── */}
          {authMethod && viewState === 'login' && (
            <motion.div key={`login-${authMethod}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {/* Selected method badge */}
              {!otpSent && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', padding: '10px 14px', background: authMethod === 'phone' ? 'rgba(124,58,237,0.06)' : 'rgba(59,130,246,0.06)', borderRadius: '12px', border: `1px solid ${authMethod === 'phone' ? 'rgba(124,58,237,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {authMethod === 'phone' ? <Phone size={15} color="var(--primary)" /> : <Mail size={15} color="#3B82F6" />}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {authMethod === 'phone' ? 'Phone Number' : 'Email Address'}
                    </span>
                  </div>
                  {(!localStorage.getItem('preferredAuthMethod')) && (
                    <button type="button" onClick={resetMethod} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', padding: '2px 6px', borderRadius: '6px' }}>
                      Change
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleLogin}>
                {errors.general && <div className="auth-error">{errors.general}</div>}

                {!otpSent ? (
                  <>
                    {authMethod === 'phone' ? (
                      <PhoneField
                        label="Phone Number"
                        id="l-id"
                        value={loginPhone}
                        onChange={setLoginPhone}
                        autoFocus
                      />
                    ) : (
                      <Field label="Email Address"
                        type="email"
                        id="l-id" value={login.identifier}
                        onChange={e => setLogin(p => ({ ...p, identifier: e.target.value }))}
                        icon={Mail}
                        placeholder="you@company.com"
                        autoFocus />
                    )}
                    {errors.identifier && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-8px', marginBottom: '12px' }}>{errors.identifier}</p>}
                    <Field label="Password" type="password" id="l-pw" value={login.password}
                      onChange={e => setLogin(p => ({ ...p, password: e.target.value }))}
                      icon={Lock} placeholder="Enter your password" />
                    <div className="auth-row">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <input type="checkbox" style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }} />
                        Remember me
                      </label>
                      <button type="button" className="auth-forgot"
                        onClick={() => { setFpStep('enterIdentifier'); setFpIdentifier('') }}>
                        Forgot password?
                      </button>
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <OtpInput value={otpCode} onChange={setOtpCode}
                      destination={authMethod === 'phone' ? loginPhone.trim() : login.identifier}
                      loading={loading}
                      onResend={async () => { try { const id = authMethod === 'phone' ? loginPhone.trim() : login.identifier; const res = await sendOTP(id); setDevOtp(res.devOtp || ''); alert('New OTP sent!') } catch { alert('Failed to resend.') } }} />
                  </motion.div>
                )}

                <motion.button type="submit" className="auth-submit" disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {loading ? 'Processing...' : otpSent ? 'Verify & Sign In' : 'Sign In'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── REGISTER FORM (phone or email — whichever was chosen) ── */}
          {authMethod && viewState === 'register' && (
            <motion.div key={`register-${authMethod}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {/* Selected method badge */}
              {!otpSent && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', padding: '10px 14px', background: authMethod === 'phone' ? 'rgba(124,58,237,0.06)' : 'rgba(59,130,246,0.06)', borderRadius: '12px', border: `1px solid ${authMethod === 'phone' ? 'rgba(124,58,237,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {authMethod === 'phone' ? <Phone size={15} color="var(--primary)" /> : <Mail size={15} color="#3B82F6" />}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {authMethod === 'phone' ? 'Using Phone Number' : 'Using Email Address'}
                    </span>
                  </div>
                  <button type="button" onClick={resetMethod} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', padding: '2px 6px', borderRadius: '6px' }}>
                    Change
                  </button>
                </div>
              )}

              <form onSubmit={handleRegister}>
                {errors.general && <div className="auth-error">{errors.general}</div>}

                {!otpSent ? (
                  <>
                    <Field label="Full Name" id="r-name" value={reg.name}
                      onChange={e => setReg(p => ({ ...p, name: e.target.value }))}
                      icon={User} placeholder="Your display name" autoFocus />
                    {errors.name && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-12px', marginBottom: '12px' }}>{errors.name}</p>}

                    {authMethod === 'phone' ? (
                      <PhoneField
                        label="Phone Number"
                        id="r-id"
                        value={regPhone}
                        onChange={setRegPhone}
                      />
                    ) : (
                      <Field label="Email Address"
                        type="email"
                        id="r-id" value={reg.identifier}
                        onChange={e => setReg(p => ({ ...p, identifier: e.target.value }))}
                        icon={Mail}
                        placeholder="you@company.com" />
                    )}
                    {errors.identifier && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-12px', marginBottom: '12px' }}>{errors.identifier}</p>}

                    <SelectField label="Native Language" id="r-lang" value={reg.language}
                      onChange={e => setReg(p => ({ ...p, language: e.target.value }))}
                      icon={Globe} options={langs} />

                    <Field label="Password" type="password" id="r-pw" value={reg.password}
                      onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                      icon={Lock} placeholder="Create strong password" />
                    {errors.password && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-12px', marginBottom: '12px' }}>{errors.password}</p>}
                    <StrengthMeter password={reg.password} />

                    <Field label="Confirm Password" type="password" id="r-cpw" value={reg.confirmPassword}
                      onChange={e => setReg(p => ({ ...p, confirmPassword: e.target.value }))}
                      icon={Lock} placeholder="Re-enter your password" />
                    {errors.confirmPassword && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-12px', marginBottom: '12px' }}>{errors.confirmPassword}</p>}
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <OtpInput value={otpCode} onChange={setOtpCode}
                      destination={authMethod === 'phone' ? regPhone.trim() : reg.identifier}
                      loading={loading}
                      onResend={async () => { try { const id = authMethod === 'phone' ? regPhone.trim() : reg.identifier; const res = await sendOTP(id); setDevOtp(res.devOtp || ''); alert('New OTP sent!') } catch { alert('Failed to resend.') } }} />
                  </motion.div>
                )}

                <motion.button type="submit" className="auth-submit" disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {loading ? 'Connecting...' : otpSent ? 'Verify & Complete' : 'Create Account'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider + Social */}
        <div className="auth-divider">or continue with</div>
        <div className="auth-social" style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="btn-social" type="button" onClick={() => loginWithGoogle()} style={{ width: '100%' }}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>

        {/* Switch view */}
        <div className="auth-switch">
          {viewState === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-switch-btn"
            onClick={() => switchView(viewState === 'login' ? 'register' : 'login')}>
            {viewState === 'login' ? 'Register for free' : 'Sign in here'}
          </button>
        </div>

        {/* ── Forgot Password Overlay ── */}
        <AnimatePresence>
          {fpStep !== 'idle' && (
            <motion.div
              key="fp-overlay"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'var(--bg-card, rgba(255,255,255,0.96))',
                backdropFilter: 'blur(20px)',
                borderRadius: 'inherit',
                padding: '36px 32px',
                display: 'flex', flexDirection: 'column',
                zIndex: 50,
                overflowY: 'auto',
              }}
            >
              <button onClick={() => setFpStep('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '24px', padding: 0 }}>
                <ArrowLeft size={15} /> Back to sign in
              </button>

              {fpStep === 'enterIdentifier' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <KeyRound size={20} color="var(--primary)" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>Reset Password</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>Enter your account email or phone</p>
                    </div>
                  </div>
                  <form onSubmit={handleForgotSend}>
                    <Field label="Email or Phone" id="fp-id" value={fpIdentifier}
                      onChange={e => setFpIdentifier(e.target.value)}
                      icon={Mail} placeholder="you@email.com or +91 98765..." autoFocus />
                    {fpErrors.id && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-8px', marginBottom: '12px' }}>{fpErrors.id}</p>}
                    <motion.button type="submit" className="auth-submit" disabled={loading}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {loading ? 'Sending...' : 'Send Reset Code'}
                    </motion.button>
                  </form>
                </>
              )}

              {fpStep === 'enterOtp' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={20} color="var(--primary)" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>Enter Reset Code</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>Sent to <strong style={{ color: 'var(--primary)' }}>{fpIdentifier}</strong></p>
                    </div>
                  </div>
                  <OtpInput value={fpOtp} onChange={setFpOtp}
                    destination={fpIdentifier} loading={loading}
                    onResend={async () => { try { await forgotFn(fpIdentifier.trim()); alert('New code sent!') } catch { alert('Failed to resend.') } }} />
                  <motion.button className="auth-submit" disabled={loading}
                    onClick={() => fpOtp.length === 6 && setFpStep('newPassword')}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    {loading ? 'Verifying...' : 'Continue'}
                  </motion.button>
                </>
              )}

              {fpStep === 'newPassword' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={20} color="var(--primary)" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>Set New Password</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>Choose a strong password</p>
                    </div>
                  </div>
                  <form onSubmit={handleForgotReset}>
                    <Field label="New Password" type="password" id="fp-np" value={fpNewPass}
                      onChange={e => setFpNewPass(e.target.value)} icon={Lock} placeholder="Min. 6 characters" autoFocus />
                    <StrengthMeter password={fpNewPass} />
                    <Field label="Confirm Password" type="password" id="fp-cp" value={fpConfirm}
                      onChange={e => setFpConfirm(e.target.value)} icon={Lock} placeholder="Re-enter password" />
                    {fpErrors.pw && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-8px', marginBottom: '12px' }}>{fpErrors.pw}</p>}
                    <motion.button type="submit" className="auth-submit" disabled={loading}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {loading ? 'Saving...' : 'Reset Password'}
                    </motion.button>
                  </form>
                </>
              )}

              {fpStep === 'done' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle2 size={32} color="#fff" strokeWidth={2} />
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Password Reset!</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                  <motion.button className="auth-submit" onClick={() => setFpStep('idle')}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    Back to Sign In
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContent />
    </GoogleOAuthProvider>
  )
}
