// LandingPage.jsx — Purple Premium Design (Overhauled)
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Sun, Moon, Bot, Globe2, Zap, ArrowRight, Shield, Languages, Mic, Video, Image as ImageIcon, Phone, Twitter, Github, Linkedin, X, Mail } from 'lucide-react'
import useStore from "../store/useStore.js"
import "../landing.css"

const FEATURES = [
  { icon: Zap, title: "Sub-300ms Translation", desc: "Messages auto-translate in under 300ms. Your flow stays perfectly intact.", gradient: "linear-gradient(135deg, #7C3AED, #6366F1)", iconGlow: "rgba(124,58,237,0.4)" },
  { icon: Globe2, title: "Global Group Chats", desc: "Create multilingual groups — each member reads in their native tongue.", gradient: "linear-gradient(135deg, #EC4899, #F43F5E)", iconGlow: "rgba(236,72,153,0.4)" },
  { icon: Languages, title: "30+ Languages", desc: "English, Hindi, Spanish, French, Japanese, Arabic, German, and many more.", gradient: "linear-gradient(135deg, #F59E0B, #EF4444)", iconGlow: "rgba(245,158,11,0.4)" },
  { icon: Shield, title: "End-to-End Encrypted", desc: "Every message protected with AES-256. Zero data retention options available.", gradient: "linear-gradient(135deg, #10B981, #3B82F6)", iconGlow: "rgba(16,185,129,0.4)" },
  { icon: Video, title: "Real-Time Calls", desc: "Crystal clear native video and voice calling, securely routed via custom rooms.", gradient: "linear-gradient(135deg, #8B5CF6, #D946EF)", iconGlow: "rgba(139,92,246,0.4)" },
  { icon: ImageIcon, title: "Rich Media & Contacts", desc: "Share high-res photos, stickers, and contact cards seamlessly within chats.", gradient: "linear-gradient(135deg, #06B6D4, #3B82F6)", iconGlow: "rgba(6,182,212,0.4)" },
]

const STEPS = [
  { step: "01", title: "Create Account", desc: "Secure signup with Phone, Email, or Google SSO in under 60 seconds." },
  { step: "02", title: "Add Connections", desc: "Discover and invite team members instantly, anywhere in the world." },
  { step: "03", title: "Chat Naturally", desc: "Type in your language — they read in theirs. Flawlessly, in real-time." },
  { step: "04", title: "Expand Horizons", desc: "Scale your global communication securely and without barriers." },
]

const STATS = [
  { num: "<300ms", label: "Translation Speed" },
  { num: "30+", label: "Languages Supported" },
  { num: "99.9%", label: "Uptime SLA" },
]

// ── Animated Counter ──
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value)
  const ref = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasRun.current) {
        hasRun.current = true
        const nums = value.replace(/[^0-9]/g, '')
        const suffix = value.replace(/[0-9]/g, '')
        if (!nums) return
        let start = 0
        const end = parseInt(nums)
        const duration = 1600
        const step = Math.ceil(end / (duration / 16))
        const timer = setInterval(() => {
          start += step
          if (start >= end) { setDisplay(value); clearInterval(timer) }
          else setDisplay(start + suffix)
        }, 16)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return <span ref={ref}>{display}</span>
}

// ── Animated Chat Demo ──
function HeroChatDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [400, 1400, 2400, 3400].map((d, i) =>
      setTimeout(() => setStep(i + 1), d)
    )
    const reset = setTimeout(() => setStep(0), 5400)
    return () => { timers.forEach(clearTimeout); clearTimeout(reset) }
  }, [step > 3 ? step : null])

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 300)
      return () => clearTimeout(t)
    }
  }, [step])

  return (
    <div className="ll-demo-chrome">
      {/* Browser bar */}
      <div className="ll-demo-bar">
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#FF5F57', '#FEBC2E', '#27C840'].map((c, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>LinguaLink AI</span>
        </div>
        <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#16A34A', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>● Live</span>
      </div>

      {/* Messages */}
      <div className="ll-demo-body">
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '3px 12px', borderRadius: '999px' }}>
            Today
          </span>
        </div>

        <AnimatePresence>
          {step >= 1 && (
            <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.35 }}
              style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: 'row-reverse' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#6366F1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, flexShrink: 0 }}>Me</div>
              <div>
                <div style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)', borderRadius: '14px 14px 4px 14px', padding: '11px 16px' }}>
                  <p style={{ fontSize: '13.5px', margin: 0, lineHeight: 1.5, color: '#fff' }}>नमस्ते! क्या आपने नई रिपोर्ट चेक की? 📄</p>
                </div>
                <div style={{ textAlign: 'right', marginTop: '4px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Sent in Hindi · 10:24 AM</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '36px' }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7C3AED' }}
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ delay: i * 0.14, duration: 0.55, repeat: Infinity }} />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>AI translating HI → ES...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 3 && (
            <motion.div initial={{ opacity: 0, x: -20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.35 }}
              style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, flexShrink: 0 }}>MG</div>
              <div>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px 14px 14px 4px', padding: '11px 16px' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>¡Hola! Sí, todo se ve muy preciso. 👍</p>
                </div>
                <div style={{ marginTop: '4px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Bot size={10} color="var(--text-muted)" />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Translated from ES · 10:25 AM</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="ll-demo-footer">
        <div style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Type your message...
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#7C3AED,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
          <span style={{ color: '#fff', fontSize: '16px' }}>↑</span>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════
// MAIN LANDING PAGE
// ══════════════════════════════════
export default function LandingPage() {
  const navigate = useNavigate()
  const { darkMode, setDarkMode } = useStore()
  const [activeFooterModal, setActiveFooterModal] = useState(null)

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* ═══ NAVBAR ═══ */}
      <nav className="ll-nav">
        <div className="ll-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.button className="ll-logo-mark" style={{ background: 'transparent', boxShadow: 'none' }} whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/')}>
              <img src="/features/logo.PNG" alt="Logo" style={{ width: '120%', height: '120%', objectFit: 'cover' }} />
            </motion.button>
            <span className="ll-logo-text"><span style={{ color: 'var(--text-primary)' }}>Lingua</span><span style={{ color: 'var(--primary)' }}>Link</span></span>
          </div>

          <div style={{ display: 'flex', gap: '32px' }}>
            <a href="#features" className="ll-nav-link">Features</a>
            <a href="#how" className="ll-nav-link">How it Works</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.button className="ll-toggle-btn" onClick={() => setDarkMode(!darkMode)} whileHover={{ scale: 1.05 }}>
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </motion.button>
            <button className="ll-login-btn" onClick={() => navigate('/auth', { state: { tab: 'login' } })}>Log In</button>
            <motion.button className="btn-primary-purple" onClick={() => navigate('/auth', { state: { tab: 'register' } })}
              style={{ padding: '10px 22px', fontSize: '13.5px' }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              Get Started →
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="ll-hero">

        <div className="ll-hero-inner">
          {/* Left */}
          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}>
            <h1 className="ll-hero-h1">
              Type in your<br />
              <span style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Language</span> —<br />
              they read in theirs.
            </h1>
            <p className="ll-hero-sub">
              Powering global teams with instant AI message translation inside a secure, professional enterprise platform.
            </p>

            <div className="ll-hero-cta">
              <motion.button className="btn-primary-purple" onClick={() => navigate('/auth', { state: { tab: 'register' } })}
                style={{ padding: '15px 34px', fontSize: '15px' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                Start For Free <ArrowRight size={16} />
              </motion.button>
            </div>

          </motion.div>

          {/* Right: Demo */}
          <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}>
            <HeroChatDemo />
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS ROW ═══ */}
      <div className="ll-stats-container">
        <div className="ll-stats-card">
          {STATS.map((s, i) => (
            <motion.div key={i} className="ll-stat-item-pro"
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}>
              <div className="ll-stat-num-pro"><AnimatedNumber value={s.num} /></div>
              <div className="ll-stat-label-pro">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══ FEATURES — Glassmorphism Cards ═══ */}
      <section id="features" className="ll-features">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '0' }}>
            <span className="ll-section-label">Our Capabilities</span>
            <h2 className="ll-section-title">Features that scale globally</h2>
            <p className="ll-section-sub">
              Uncompromising privacy coupled with bleeding-edge AI translation ensures flawless collaboration across any team, anywhere.
            </p>
          </div>
          <div className="ll-feat-grid">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} className="ll-feat-card-pro"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}>

                  <div className="ll-feat-icon-wrap" style={{ background: f.gradient, boxShadow: `0 8px 24px ${f.iconGlow}` }}>
                    <Icon size={26} color="#fff" />
                  </div>

                  <h3 className="ll-feat-card-title">{f.title}</h3>
                  <p className="ll-feat-card-desc">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU SHOULD KNOW ═══ */}
      <section style={{ padding: '88px 32px', background: 'linear-gradient(135deg,#7C3AED 0%,#6366F1 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', display: 'block' }}>What you should know</span>
            <h2 style={{ fontSize: '44px', fontWeight: 900, color: '#fff', fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '14px' }}>
              It's where technology<br />meets expert service.
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, marginBottom: '28px' }}>
              LinguaLink's AI-powered engine handles the complexity — you just communicate. No configuration, no friction, just seamless multilingual collaboration.
            </p>
            <button className="btn-outline-white" onClick={() => navigate('/auth', { state: { tab: 'register' } })}>Get started free →</button>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
            {[
              { icon: <Languages size={20} />, title: 'Real-time language translation?', sub: 'Every message auto-translates in under 300ms — your flow stays intact.' },
              { icon: <Shield size={20} />, title: 'What is end-to-end encryption?', sub: 'AES-256 protects every message. Zero data retention available.' },
              { icon: <Mic size={20} />, title: 'Voice messages & calls?', sub: 'Send voice notes and make crystal-clear video or voice calls.' },
              { icon: <Globe2 size={20} />, title: 'Global group chats?', sub: 'Each member reads messages in their own native language.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '18px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '12px', backdropFilter: 'blur(8px)', cursor: 'default', transition: 'background 0.2s' }}
                whileHover={{ background: 'rgba(255,255,255,0.16)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0, marginBottom: '4px' }}>{item.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{item.sub}</p>
                </div>
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>→</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — Highlighted numbers, no icons ═══ */}
      <section id="how" className="ll-how">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="ll-section-label">Simple Process</span>
            <h2 className="ll-section-title">How LinguaLink Works</h2>
            <p className="ll-section-sub">
              A seamless architecture that bridges linguistic divides in under a second — designed for simplicity and scale.
            </p>
          </div>
          <div className="ll-how-grid">
            {STEPS.map((s, i) => (
              <motion.div key={i} className="ll-how-card"
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.13 }}>
                <div className="ll-how-num-highlight">{s.step}</div>
                <h3 className="ll-how-title">{s.title}</h3>
                <p className="ll-how-desc">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SIGN UP CTA ═══ */}
      <section className="ll-cta">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>

            <h2 className="ll-cta-title">
              Start communicating<br />
              <span style={{ opacity: 0.85 }}>without limits.</span>
            </h2>
            <p className="ll-cta-sub">
              No credit card required. Set up in under a minute. Connect your team globally today.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button className="btn-outline-white" onClick={() => navigate('/auth', { state: { tab: 'register' } })}
                style={{ padding: '16px 40px', fontSize: '15.5px', background: '#fff', color: '#7C3AED', border: 'none' }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                Get Started Free →
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="ll-footer" style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface)', padding: '60px 0 40px', position: 'relative', zIndex: 10 }}>
        <div className="ll-footer-inner" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="ll-logo-mark" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-hover)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                <img src="/features/logo.PNG" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '20px', fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.02em' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Lingua</span><span style={{ color: 'var(--primary)' }}>Link</span>
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Global Connectivity</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              {['Privacy Policy', 'Terms of Service', 'Security', 'Contact Us'].map(l => (
                <span key={l} style={{ fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                  onClick={() => setActiveFooterModal(l)}
                  onMouseEnter={e => e.target.style.color = 'var(--primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >{l}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '30px', flexWrap: 'wrap', gap: '20px' }}>
            <p className="ll-footer-copy" style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              © 2026 LinguaLink. Redefining professional global connectivity. All rights reserved.
            </p>
          </div>

        </div>
      </footer>

      {/* ═══ FOOTER MODALS ═══ */}
      <AnimatePresence>
        {activeFooterModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setActiveFooterModal(null)}
            />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '32px', maxWidth: '650px', width: '100%', position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              
              <button onClick={() => setActiveFooterModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
                  {activeFooterModal === 'Privacy Policy' ? <Shield size={20} /> : activeFooterModal === 'Contact Us' ? <Mail size={20} /> : <Zap size={20} />}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{activeFooterModal}</h2>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: 1.7, maxHeight: '60vh', overflowY: 'auto', paddingRight: '14px' }} className="custom-scrollbar">
                {activeFooterModal === 'Contact Us' && (
                  <div>
                    <p>Have questions, need help with your account, or want to share feedback? We are here to assist you with any inquiries regarding your LinguaLink experience.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                      <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>General Support & Inquiries</span>
                        <a href="mailto:as.archishah@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>as.archishah@gmail.com</a>
                      </div>
                    </div>
                  </div>
                )}

                {activeFooterModal === 'Privacy Policy' && (
                  <div>
                    <p style={{ marginBottom: '16px' }}><strong>Last Updated: June 2026</strong></p>
                    <p style={{ marginBottom: '16px' }}>LinguaLink is committed to protecting your privacy. This policy outlines how we handle the data processed through our AI translation and communication platform.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>1. Data Collection & AI Processing</h3>
                    <p style={{ marginBottom: '16px' }}>To provide sub-300ms translations, messages and voice notes are temporarily processed by our AI engines in memory. <strong>No chat data is used to train our AI models</strong> without explicit enterprise opt-in. Once delivered, data is stored encrypted at rest.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>2. End-to-End Encryption</h3>
                    <p style={{ marginBottom: '16px' }}>We utilize industry-standard E2E encryption for 1-on-1 chats and WebRTC secure rooms for audio/video calls. Only the intended recipients hold the decryption keys.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>3. Data Retention</h3>
                    <p>By default, users and organizations have full control over data retention policies. You can configure automatic message deletion, and deleting an account immediately purges all associated identifiable information from our active servers.</p>
                  </div>
                )}

                {activeFooterModal === 'Terms of Service' && (
                  <div>
                    <p style={{ marginBottom: '16px' }}><strong>Last Updated: June 2026</strong></p>
                    <p style={{ marginBottom: '16px' }}>By accessing and using LinguaLink, you agree to comply with our terms designed to maintain a secure and professional global connectivity environment.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>1. Acceptable Use</h3>
                    <p style={{ marginBottom: '16px' }}>LinguaLink is a professional platform. Users must not use our API or communication tools to transmit malicious software, engage in illegal activities, or abuse our real-time AI translation endpoints via automated scraping.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>2. Service Level Agreement (SLA)</h3>
                    <p style={{ marginBottom: '16px' }}>We guarantee a 99.9% uptime for our core messaging and WebRTC signaling servers. Translation latencies are optimized for sub-300ms delivery, though exact speeds may vary based on network conditions and language pairs.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>3. Account Termination</h3>
                    <p>LinguaLink reserves the right to suspend or terminate accounts that violate these terms, including unauthorized reselling of our AI translation bandwidth or API access.</p>
                  </div>
                )}

                {activeFooterModal === 'Security' && (
                  <div>
                    <p style={{ marginBottom: '16px' }}>At LinguaLink, security is integrated into every layer of our global communication stack. We are built for enterprise-grade compliance and data protection.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>1. Cryptographic Standards</h3>
                    <p style={{ marginBottom: '16px' }}>All data in transit is secured using TLS 1.3. Data at rest (including user profiles and encrypted message blobs) is secured using AES-256 encryption. Our WebRTC media streams (audio/video) are secured via DTLS-SRTP.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>2. Compliance & Audits</h3>
                    <p style={{ marginBottom: '16px' }}>LinguaLink's infrastructure is hosted on ISO 27001 and SOC 2 Type II certified data centers. We undergo routine third-party penetration testing to ensure our WebSockets and REST APIs are resilient against modern threats.</p>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>3. Zero Trust Architecture</h3>
                    <p>We operate on a zero-trust model. Internal access to production infrastructure requires hardware MFA and is strictly logged. AI translation occurs in isolated, ephemeral serverless environments to prevent data leakage.</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setActiveFooterModal(null)} className="btn-primary-purple" style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Acknowledge & Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}