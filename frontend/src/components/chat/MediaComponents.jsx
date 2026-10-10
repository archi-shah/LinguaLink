import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, File, Play, Pause, FileText, Image as ImageIcon, X } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────
const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

export const fileUrl = (path) => path ? (path.startsWith('http') ? path : `${SERVER}${path}`) : ''

async function downloadFile(url, fileName) {
  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000)
  } catch (err) {
    // Fallback: open in new tab
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function getExt(name) {
  if (!name) return ''
  return name.split('.').pop().toUpperCase()
}

function getDocColor(ext) {
  const map = {
    PDF: '#E53E3E', DOC: '#2B6CB0', DOCX: '#2B6CB0',
    XLS: '#2F855A', XLSX: '#2F855A', PPT: '#C05621', PPTX: '#C05621',
    ZIP: '#744210', RAR: '#744210', TXT: '#4A5568', CSV: '#276749',
  }
  return map[ext] || '#6B46C1'
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

// ── Components ───────────────────────────────────────────────────────────────

export function ImageMessage({ msg, isSent, onImageClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const src = msg.mediaUrl ? fileUrl(msg.mediaUrl) : msg.metadata?.dataUrl;
  const caption = msg.originalText || '';

  return (
    <div 
      style={{ 
        maxWidth: '320px', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        position: 'relative', 
        background: 'var(--bg-hover)',
        boxShadow: isHovered ? '0 12px 30px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onImageClick && onImageClick(src)}
    >
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={src}
          alt="photo"
          style={{ 
            width: '100%', 
            display: 'block', 
            maxHeight: '400px', 
            objectFit: 'cover',
            transform: isHovered ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.4s ease'
          }}
          loading="lazy"
        />
        
        {/* Overlay for Download & Maximize Icons */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }} />
        
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'all 0.3s ease',
          pointerEvents: isHovered ? 'auto' : 'none'
        }}>
          <button onClick={(e) => { e.stopPropagation(); downloadFile(src, src.split('/').pop() || 'image') }} style={{
            width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'background 0.2s', cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <Download size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      
      {caption && (
        <div style={{ 
          padding: '12px 16px', 
          fontSize: '14px', 
          fontWeight: 500,
          color: isSent ? '#fff' : 'var(--text-primary)',
          background: isSent ? 'rgba(255,255,255,0.1)' : 'var(--bg-surface)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: isSent ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-light)'
        }}>
          {caption}
        </div>
      )}
    </div>
  )
}

export function VideoMessage({ msg, isSent }) {
  const caption = msg.originalText || ''
  return (
    <div style={{ maxWidth: '280px', borderRadius: '12px', overflow: 'hidden', position: 'relative', background: '#000' }}>
      <video
        src={fileUrl(msg.mediaUrl)}
        controls
        style={{ width: '100%', maxHeight: '320px', display: 'block', objectFit: 'contain' }}
      />
      {caption && (
        <div style={{ padding: '8px 12px', fontSize: '14px', color: '#fff', background: isSent ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)' }}>
          {caption}
        </div>
      )}
    </div>
  )
}

export function DocumentMessage({ msg, isSent }) {
  const [showPreview, setShowPreview] = React.useState(false)
  const isUploading = msg.metadata?.uploading || (!msg.mediaUrl && isSent)
  const fileName = msg.metadata?.fileName || msg.mediaUrl?.split('/').pop() || 'Document'
  const fileSize = msg.metadata?.fileSize
  const ext = getExt(fileName)
  const color = getDocColor(ext)
  const url = fileUrl(msg.mediaUrl)
  const caption = msg.originalText
  const isPdf = ext === 'PDF'

  // Color map for document card headers
  const colorMap = { PDF: '#E53E3E', DOC: '#2B6CB0', DOCX: '#2B6CB0', XLS: '#2F855A', XLSX: '#2F855A', PPT: '#C05621', PPTX: '#C05621', ZIP: '#744210', RAR: '#744210', TXT: '#4A5568', CSV: '#276749' }
  const cardColor = colorMap[ext] || '#6B46C1'

  return (
    <>
      <div
        style={{ minWidth: '220px', maxWidth: '280px', borderRadius: '14px', overflow: 'hidden', border: isSent ? '1px solid rgba(255,255,255,0.14)' : '1px solid var(--border-light)', cursor: isUploading ? 'default' : 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease', opacity: isUploading ? 0.7 : 1 }}
        onClick={() => !isUploading && setShowPreview(true)}
        title={isUploading ? "Uploading..." : "Click to preview"}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
      >
        {/* Document thumbnail card */}
        <div style={{ background: isSent ? 'rgba(255,255,255,0.08)' : 'var(--bg-surface)', padding: '12px 14px 10px' }}>
          <div style={{ width: '100%', height: '110px', background: '#fff', borderRadius: '8px', overflow: 'hidden', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            {/* Colored top band */}
            <div style={{ height: '6px', background: cardColor }} />
            {/* Simulated document lines */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[90, 70, 100, 55, 80, 45, 95, 60].map((w, i) => (
                <div key={i} style={{ height: '5px', background: i === 0 ? '#1a1a2e' : '#E2E8F0', borderRadius: '2px', width: `${w}%`, opacity: i === 0 ? 0.75 : 0.55 }} />
              ))}
            </div>
            {/* File type badge bottom-right */}
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: cardColor, color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.04em' }}>
              {ext || 'FILE'}
            </div>
          </div>
        </div>

        {/* Bottom info row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: '10px', background: isSent ? 'rgba(255,255,255,0.1)' : 'var(--bg-hover)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
            {ext || 'FILE'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: isSent ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fileName}
            </div>
            <div style={{ fontSize: '11px', color: isSent ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: '1px' }}>
              {isUploading ? 'Uploading...' : `${fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB · ` : ''}${ext} Document`}
            </div>
          </div>
          {isUploading ? (
            <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="admin-spinner" style={{ width: 14, height: 14, borderColor: isSent ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', borderTopColor: isSent ? '#fff' : '#000' }} />
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); downloadFile(url, fileName) }}
              title="Download"
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSent ? '#fff' : 'var(--text-secondary)', flexShrink: 0, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = isSent ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = isSent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)'}
            >
              <Download size={15} />
            </button>
          )}
        </div>

        {caption && (
          <div style={{ padding: '8px 12px', fontSize: '13.5px', borderTop: isSent ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-light)', color: isSent ? '#fff' : 'var(--text-primary)', background: isSent ? 'transparent' : 'var(--bg-surface)' }}>
            {caption}
          </div>
        )}
      </div>

      {/* Full-screen document preview portal */}
      {showPreview && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column' }}
          onClick={() => setShowPreview(false)}
        >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'rgba(0,0,0,0.5)', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: cardColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
                  {ext || 'FILE'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB · ` : ''}{ext} Document</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); downloadFile(url, fileName) }}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: 'none', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Preview area */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                {isPdf ? (
                  <object
                    data={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    type="application/pdf"
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#525659' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', gap: '20px', padding: '40px' }}>
                      <FileText size={64} opacity={0.7} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Browser Cannot Preview PDF</div>
                        <div style={{ fontSize: '14px', opacity: 0.6 }}>Your browser does not support inline PDF viewing.</div>
                      </div>
                      <button
                        onClick={() => downloadFile(url, fileName)}
                        style={{ padding: '12px 28px', borderRadius: '12px', background: cardColor, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Download size={18} /> Download PDF
                      </button>
                    </div>
                  </object>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', gap: '20px', padding: '40px' }}>
                    {/* Large document card */}
                    <div style={{ width: '180px', height: '230px', background: '#fff', borderRadius: '12px', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                      <div style={{ height: '7px', background: cardColor }} />
                      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {[95, 70, 100, 55, 82, 48, 90, 62, 75, 50].map((w, i) => (
                          <div key={i} style={{ height: '6px', background: i === 0 ? '#1a1a2e' : '#E2E8F0', borderRadius: '3px', width: `${w}%`, opacity: i === 0 ? 0.8 : 0.6 }} />
                        ))}
                      </div>
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: cardColor, color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '5px' }}>
                        {ext || 'FILE'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{fileName}</div>
                      <div style={{ fontSize: '14px', opacity: 0.6 }}>{fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB · ` : ''}{ext} Document</div>
                    </div>
                    <button
                      onClick={() => downloadFile(url, fileName)}
                      style={{ padding: '12px 28px', borderRadius: '12px', background: cardColor, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Download size={18} /> Download File
                    </button>
                  </div>
                )}
              </div>
        </div>,
        document.body
      )}
    </>
  )
}

export function AudioPlayer({ msg, isSent }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return
    const bounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - bounds.left
    const percent = x / bounds.width
    audioRef.current.currentTime = percent * duration
  }

  return (
    <div style={{ width: '240px', display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
      <audio
        ref={audioRef}
        src={fileUrl(msg.mediaUrl)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
            if (duration) setProgress((audioRef.current.currentTime / duration) * 100)
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration !== Infinity) {
            setDuration(audioRef.current.duration)
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      <button
        onClick={togglePlay}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: isSent ? 'rgba(255,255,255,0.2)' : 'var(--primary)',
          color: '#fff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          onClick={handleSeek}
          style={{ width: '100%', height: '4px', background: isSent ? 'rgba(255,255,255,0.3)' : 'var(--border-medium)', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
        >
          <div style={{ width: `${progress}%`, height: '100%', background: isSent ? '#fff' : 'var(--primary)', borderRadius: '2px', position: 'relative' }}>
            <div style={{ position: 'absolute', right: '-4px', top: '-3px', width: '10px', height: '10px', borderRadius: '50%', background: isSent ? '#fff' : 'var(--primary)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: isSent ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : '0:00'}</span>
        </div>
      </div>
    </div>
  )
}
