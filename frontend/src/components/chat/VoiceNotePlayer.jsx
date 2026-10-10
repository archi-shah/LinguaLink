import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { chatAPI } from '../../api/client.js'
import useStore from '../../store/useStore.js'

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceNotePlayer({ msg, isSent }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [hasStarted, setHasStarted] = useState(false)
  const [localText, setLocalText] = useState(null)
  const audioRef = useRef(null)
  const waveContainerRef = useRef(null)
  
  const user = useStore(s => s.user)
  const preferredLanguage = user?.language || 'en'

  useEffect(() => {
    // When component mounts or src changes, load metadata to get duration
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [msg.mediaUrl]);

  useEffect(() => {
    const handleOtherPlay = (e) => {
      const playingId = e.detail;
      const myId = msg._id || msg.id;
      if (playingId !== myId && isPlaying) {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener('audioPlay', handleOtherPlay);
    return () => window.removeEventListener('audioPlay', handleOtherPlay);
  }, [msg._id, msg.id, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return
    if (!hasStarted) setHasStarted(true)
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      window.dispatchEvent(new CustomEvent('audioPlay', { detail: msg._id || msg.id }))
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100 || 0)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
  }

  const toggleSpeed = () => {
    if (!audioRef.current) return;
    const nextSpeed = playbackSpeed === 1 ? 1.5 : (playbackSpeed === 1.5 ? 2 : 1);
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  }

  const handleWaveClick = (e) => {
    if (!audioRef.current || !waveContainerRef.current) return;
    const rect = waveContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * (audioRef.current.duration || 0);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  }

  // Pre-computed heights to look like a natural voice recording
  const heightMap = [3, 5, 8, 12, 16, 14, 18, 22, 17, 13, 9, 15, 19, 24, 20, 15, 10, 7, 5, 9, 14, 18, 12, 8, 11, 16, 20, 22, 17, 13, 9, 6, 4, 5, 3];

  return (
    <div style={{ minWidth: '240px', marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', padding: '4px 0' }}>
        <button
          onClick={togglePlay}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: isSent ? '#fff' : 'var(--primary)', color: isSent ? 'var(--primary)' : '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
        </button>
        <div style={{ flex: 1 }}>
          {/* Authentic static waveform - Now Interactive */}
          <div 
            ref={waveContainerRef}
            onClick={handleWaveClick}
            style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '24px', cursor: 'pointer', padding: '4px 0' }}
          >
            {heightMap.map((h, i) => {
              const barProgress = (i / heightMap.length) * 100;
              const isFilled = progress > barProgress;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}px`,
                    background: isFilled ? (isSent ? '#fff' : 'var(--primary)') : (isSent ? 'rgba(255,255,255,0.3)' : 'rgba(139,92,246,0.3)'),
                    borderRadius: '2px',
                    transition: 'background 0.1s linear'
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Audio details: Time and Speed */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: isSent ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <button 
          onClick={toggleSpeed}
          style={{ 
            background: isSent ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)', 
            border: 'none', 
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '11px', 
            fontWeight: 700,
            color: isSent ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          {playbackSpeed}x
        </button>
      </div>

      {(() => {
        const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        return (
          <audio
            ref={audioRef}
            src={`${apiBase}${msg.mediaUrl}`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            preload="metadata"
            style={{ display: 'none' }}
          />
        );
      })()}

    </div>
  )
}
