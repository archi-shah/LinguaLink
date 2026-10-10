import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export const COUNTRIES = [
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'RU', name: 'Russia', dial: '+7' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'AE', name: 'UAE', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'GR', name: 'Greece', dial: '+30' },
  { code: 'IL', name: 'Israel', dial: '+972' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
]

// Real flag image from flagcdn.com (works on all platforms including Windows)
function FlagImg({ code, size = 'md' }) {
  const w = size === 'sm' ? 20 : 24
  const h = size === 'sm' ? 14 : 16
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      width={w}
      height={h}
      style={{
        borderRadius: '3px',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
      }}
      loading="lazy"
    />
  )
}

export default function PhoneField({ label, value, onChange, id, autoFocus }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  const detectCountry = (val) => {
    if (!val) return COUNTRIES[0]
    return COUNTRIES.find(c => val.startsWith(c.dial)) || COUNTRIES[0]
  }

  const [selected, setSelected] = useState(() => detectCountry(value))

  const localNumber = value
    ? value.replace(selected.dial, '').trimStart()
    : ''

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60)
  }, [open])

  const selectCountry = (country) => {
    setSelected(country)
    setOpen(false); setSearch('')
    onChange(`${country.dial} ${localNumber}`)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const handleNumberChange = (e) => {
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '')
    onChange(`${selected.dial} ${raw}`)
  }

  return (
    <div className="auth-field">
      {label && <label className="auth-label" htmlFor={id}>{label}</label>}

      <div ref={wrapRef} style={{ display: 'flex', gap: '8px', position: 'relative' }}>

        {/* ── Dial-code trigger button ── */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '0 12px',
            minWidth: '102px', height: '58px',
            borderRadius: '14px',
            border: `1.5px solid ${open ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 18%, var(--border-medium))'}`,
            background: open
              ? 'rgba(124,58,237,0.06)'
              : 'rgba(255,255,255,0.64)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: open
              ? '0 0 0 3px rgba(124,58,237,0.13), inset 0 1px 0 rgba(255,255,255,0.7)'
              : 'inset 0 1px 0 rgba(255,255,255,0.7)',
            flexShrink: 0,
          }}
        >
          <FlagImg code={selected.code} />
          <span style={{
            fontSize: '13px', fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.01em',
          }}>
            {selected.dial}
          </span>
          <ChevronDown
            size={13} color="var(--text-muted)"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
          />
        </button>

        {/* ── Phone number input ── */}
        <input
          ref={inputRef}
          id={id}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="98765 43210"
          autoFocus={autoFocus}
          autoComplete="tel"
          className="input-glass"
          style={{ flex: 1, letterSpacing: '0.05em' }}
        />

        {/* ── Dropdown ── */}
        {open && (
          <div
            role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              width: '288px',
              background: 'var(--bg-panel)',
              border: '1.5px solid var(--border-medium)',
              borderRadius: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(124,58,237,0.08)',
              zIndex: 300,
              overflow: 'hidden',
              animation: 'phoneDrop 0.18s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {/* Search bar */}
            <div style={{
              padding: '10px 10px 8px',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--bg-panel)',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} color="var(--text-muted)"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search country or dial code…"
                  style={{
                    width: '100%', padding: '9px 32px 9px 30px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')}
                    style={{
                      position: 'absolute', right: '8px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', display: 'flex', padding: 0,
                    }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Country list */}
            <div style={{ maxHeight: '216px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No results found
                </div>
              ) : filtered.map(c => {
                const isActive = c.code === selected.code
                return (
                  <button
                    key={`${c.code}-${c.dial}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => selectCountry(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '9px 14px',
                      background: isActive ? 'rgba(124,58,237,0.09)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                      borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <FlagImg code={c.code} size="sm" />
                    <span style={{
                      flex: 1, fontSize: '13px', fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                      fontFamily: 'Inter, sans-serif',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.name}
                    </span>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      fontFamily: 'Inter, sans-serif', flexShrink: 0,
                      background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                      padding: '1px 6px', borderRadius: '6px',
                    }}>
                      {c.dial}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes phoneDrop {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
