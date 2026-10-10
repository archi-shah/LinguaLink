import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Type, PenTool, Smile, Send, RotateCcw, Crop, Check } from 'lucide-react';

export default function ImageEditor({ file, onClose, onSend }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [caption, setCaption] = useState('');
  const [mode, setMode] = useState('none'); // 'draw', 'text', 'none', 'crop'
  const [color, setColor] = useState('#EF4444');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [filter, setFilter] = useState('none');
  
  const presets = [
    { name: 'Normal', value: 'none' },
    { name: 'Chrome', value: 'contrast(1.2) saturate(1.3)' },
    { name: 'Fade', value: 'contrast(0.9) brightness(1.1) saturate(0.8)' },
    { name: 'Mono', value: 'grayscale(100%) contrast(1.1)' },
    { name: 'Noir', value: 'grayscale(100%) contrast(1.3) brightness(0.9)' },
    { name: 'Warm', value: 'sepia(30%) saturate(1.2) contrast(1.1)' },
    { name: 'Cool', value: 'hue-rotate(180deg) saturate(1.1) contrast(1.1) opacity(0.8)' }
  ];

  // Drawing state
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [history, setHistory] = useState([]); // Store canvas states for undo

  // Crop state
  const [cropBox, setCropBox] = useState(null);
  const cropStartPos = useRef(null);

  // Load image to canvas
  useEffect(() => {
    if (!file) return;
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.src = objUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      // Calculate aspect ratio to fit within window
      const maxWidth = window.innerWidth;
      const maxHeight = window.innerHeight - 150; // leave space for top/bottom bars
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImageLoaded(true);
      saveState(); // Save initial state
      URL.revokeObjectURL(objUrl);
    };
  }, [file]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev, canvas.toDataURL()]);
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // remove current
    const prevState = newHistory[newHistory.length - 1];
    
    const img = new Image();
    img.src = prevState;
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistory(newHistory);
    };
  };

  // Drawing Handlers
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e) => {
    if (mode === 'none') return;
    const pos = getPos(e);
    
    if (mode === 'text' || mode === 'emoji') {
      const txt = prompt(mode === 'text' ? 'Enter text to add:' : 'Enter an emoji:');
      if (txt) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.font = mode === 'text' ? 'bold 36px Inter, sans-serif' : '64px Inter, sans-serif';
        ctx.fillStyle = mode === 'text' ? color : '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, pos.x, pos.y);
        saveState();
      }
      setMode('none');
      return;
    }

    isDrawing.current = true;
    lastPos.current = pos;
    if (mode === 'crop') {
      cropStartPos.current = pos;
      setCropBox({ x: cropStartPos.current.x, y: cropStartPos.current.y, w: 0, h: 0 });
    }
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault(); // prevent scrolling
    const currPos = getPos(e);

    if (mode === 'crop') {
      const start = cropStartPos.current;
      let x = Math.min(start.x, currPos.x);
      let y = Math.min(start.y, currPos.y);
      let w = Math.abs(currPos.x - start.x);
      let h = Math.abs(currPos.y - start.y);
      
      const rect = canvasRef.current.getBoundingClientRect();
      x = Math.max(0, x);
      y = Math.max(0, y);
      w = Math.min(rect.width - x, w);
      h = Math.min(rect.height - y, h);

      setCropBox({ x, y, w, h });
      return;
    }

    if (mode === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(currPos.x, currPos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastPos.current = currPos;
    }
  };

  const stopDraw = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      if (mode === 'draw') saveState();
    }
  };

  const applyCrop = () => {
    if (!cropBox || cropBox.w < 10 || cropBox.h < 10) {
      setMode('none');
      setCropBox(null);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
    
    canvas.width = cropBox.w;
    canvas.height = cropBox.h;
    ctx.putImageData(imageData, 0, 0);
    
    saveState();
    setCropBox(null);
    setMode('none');
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Apply the filter using an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    
    if (filter !== 'none') {
      ctx.filter = filter;
    }
    ctx.drawImage(canvas, 0, 0);

    offscreen.toBlob((blob) => {
      // Create a new File from the blob
      const newFile = new File([blob], file.name || 'edited_image.jpg', { type: file.type || 'image/jpeg' });
      onSend(newFile, caption);
    }, file.type || 'image/jpeg', 0.9);
  };

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0B141A', // WhatsApp dark background
        display: 'flex', flexDirection: 'column'
      }}
    >
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(0,0,0,0.4)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8 }}>
          <X size={28} />
        </button>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          {mode === 'crop' && cropBox ? (
            <button onClick={applyCrop} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer' }}>
              <Check size={28} />
            </button>
          ) : (
            <>
              <button onClick={undo} disabled={history.length <= 1} style={{ background: 'none', border: 'none', color: history.length <= 1 ? '#555' : '#fff', cursor: history.length <= 1 ? 'default' : 'pointer' }}>
                <RotateCcw size={24} />
              </button>
              <button onClick={() => { setMode(mode === 'crop' ? 'none' : 'crop'); setCropBox(null); }} style={{ background: 'none', border: 'none', color: mode === 'crop' ? '#10B981' : '#fff', cursor: 'pointer' }}>
                <Crop size={24} />
              </button>
              <button onClick={() => { setMode(mode === 'text' ? 'none' : 'text'); setCropBox(null); }} style={{ background: 'none', border: 'none', color: mode === 'text' ? color : '#fff', cursor: 'pointer' }} title="Add Text">
                <Type size={24} />
              </button>
              <button onClick={() => { setMode(mode === 'draw' ? 'none' : 'draw'); setCropBox(null); }} style={{ background: 'none', border: 'none', color: mode === 'draw' ? color : '#fff', cursor: 'pointer' }} title="Draw">
                <PenTool size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Color Picker (shows if mode is draw or text) */}
      {(mode === 'draw' || mode === 'text') && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '10px' }}>
          {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FFFFFF', '#000000'].map(c => (
            <button 
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer'
              }}
            />
          ))}
        </div>
      )}

      {/* Filters (shows if mode is none) */}
      {mode === 'none' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '10px', overflowX: 'auto' }}>
          {presets.map(p => (
            <button 
              key={p.name}
              onClick={() => setFilter(p.value)}
              style={{
                padding: '6px 12px', borderRadius: '16px', border: filter === p.value ? '2px solid #10B981' : '2px solid transparent',
                background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, flexShrink: 0
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <canvas 
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseOut={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            style={{ 
              filter: filter,
              cursor: mode === 'draw' ? 'crosshair' : (mode === 'crop' ? 'crosshair' : (mode === 'text' || mode === 'emoji' ? 'text' : 'default')),
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              display: 'block',
              touchAction: 'none'
            }}
          />
          {mode === 'crop' && cropBox && (
            <div style={{
              position: 'absolute',
              left: cropBox.x,
              top: cropBox.y,
              width: cropBox.w,
              height: cropBox.h,
              border: '2px dashed #10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              pointerEvents: 'none'
            }} />
          )}
        </div>
      </div>

      {/* Bottom Bar (Caption & Send) */}
      <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <input 
          type="text" 
          placeholder="Add a caption..." 
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{
            flex: 1, padding: '14px 20px', borderRadius: '24px', border: 'none',
            background: '#2A3942', color: '#fff', fontSize: '15px', outline: 'none'
          }}
        />
        <button 
          onClick={handleSend}
          style={{
            width: '48px', height: '48px', borderRadius: '50%', border: 'none',
            background: '#00A884', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
          }}
        >
          <Send size={20} style={{ marginLeft: '4px' }} />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
