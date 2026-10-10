// AdminAISettings.jsx — Manage AI Translation Engine settings
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Save, CheckCircle, Zap, Globe, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { adminAPI } from '../../api/client';

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className={`admin-toggle ${disabled ? 'disabled' : ''}`} style={{ opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
      <span className="admin-toggle-slider" />
    </label>
  );
}

const ENGINE_LOGOS = {
  gemini: { color: '#8B5CF6', label: 'Google Gemini', desc: 'Fast, advanced context understanding via Google DeepMind.', icon: Zap },
  openai: { color: '#10B981', label: 'OpenAI (ChatGPT)', desc: 'High accuracy translation with OpenAI\'s language models.', icon: Globe },
  deepl: { color: '#0EA5E9', label: 'DeepL API', desc: 'Industry leader in highly accurate neural translations.', icon: MessageSquare },
};

export default function AdminAISettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getConfig();
      setConfig(data);
    } catch (e) { 
      setError('Failed to connect to the configuration server.');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  useEffect(() => { fetchConfig(); }, []);

  const updateAiSetting = async (updates) => {
    const newAi = { ...config.aiTranslation, ...updates };
    setConfig(c => ({ ...c, aiTranslation: newAi }));
    
    setSaving(true);
    setError(null);
    try {
      await adminAPI.updateConfig('aiTranslation', newAi);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { 
      setError('Failed to save settings. Please try again.');
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return (
    <div className="admin-loading" style={{ height: '70vh' }}>
      <Loader2 className="spinner" size={32} color="var(--primary)" />
      <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading AI Core...</p>
    </div>
  );

  const ai = config?.aiTranslation || {};
  const isEnabled = ai.enabled ?? true;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {/* HEADER SECTION */}
      <div className="admin-page-header" style={{ marginBottom: 30, borderBottom: '1px solid var(--border-light)', paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: 12, 
            background: 'linear-gradient(135deg, #7C3AED, #4C74F9)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(124,58,237,0.25)'
          }}>
            <Cpu size={24} color="#fff" />
          </div>
          <div>
            <h1 className="admin-page-title" style={{ fontSize: 28, margin: 0, fontFamily: 'Outfit, sans-serif' }}>AI & Translation Core</h1>
            <p className="admin-page-subtitle" style={{ margin: '4px 0 0 0', fontSize: 14 }}>Manage global neural engines, auto-translation behaviors, and API constraints. Settings are automatically saved.</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="admin-alert error" style={{ marginBottom: 20 }}>
              <AlertTriangle size={18} />
              {error}
            </div>
          </motion.div>
        )}
        {saved && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="admin-alert success" style={{ marginBottom: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px' }}>
              <CheckCircle size={18} />
              Configuration synced to production engine
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* MAIN MASTER SWITCH */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ 
            background: isEnabled ? 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(76,116,249,0.08))' : 'var(--bg-card)', 
            border: isEnabled ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--border-medium)', 
            borderRadius: 16, padding: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.3s ease'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Global Neural Translation</h3>
            <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Enables on-the-fly message translation for all users across the platform.</p>
          </div>
          <div style={{ transform: 'scale(1.2)', marginRight: 10 }}>
            <Toggle
              checked={isEnabled}
              onChange={v => updateAiSetting({ enabled: v })}
            />
          </div>
        </motion.div>

        {/* ENGINE SELECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ 
            background: 'var(--bg-card)', borderRadius: 16, padding: '24px',
            border: '1px solid var(--border-light)',
            opacity: isEnabled ? 1 : 0.6, pointerEvents: isEnabled ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Translation Engine Selection</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {['gemini', 'openai', 'deepl'].map(engineKey => {
              const eng = ENGINE_LOGOS[engineKey];
              const isActive = ai.defaultEngine === engineKey;
              const EngineIcon = eng.icon;
              
              return (
                <div 
                  key={engineKey}
                  onClick={() => updateAiSetting({ defaultEngine: engineKey })}
                  style={{
                    padding: '16px', borderRadius: 12, cursor: 'pointer',
                    border: isActive ? `2px solid ${eng.color}` : '1px solid var(--border-medium)',
                    background: isActive ? `${eng.color}10` : 'transparent',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    position: 'relative', transition: 'all 0.2s ease',
                    boxShadow: isActive ? `0 4px 12px ${eng.color}20` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${eng.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EngineIcon size={16} color={eng.color} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{eng.label}</span>
                    </div>
                    <div style={{ 
                      width: 20, height: 20, borderRadius: '50%', 
                      border: isActive ? `6px solid ${eng.color}` : '2px solid var(--text-muted)',
                      background: 'transparent'
                    }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {eng.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* BEHAVIOR SETTINGS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ 
            background: 'var(--bg-card)', borderRadius: 16, padding: '24px',
            border: '1px solid var(--border-light)',
            opacity: isEnabled ? 1 : 0.6, pointerEvents: isEnabled ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
          }}
        >
          <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Execution Constraints</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Auto Translate Default */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Auto-Translate by Default</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>New users will automatically have messages translated to their native language.</span>
              </div>
              <Toggle
                checked={ai.autoTranslateDefault ?? true}
                onChange={v => updateAiSetting({ autoTranslateDefault: v })}
              />
            </div>
            
            <div style={{ height: 1, background: 'var(--border-light)' }} />
            
            {/* Max Chars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Max Characters per Payload</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Maximum message length permitted for API submission to avoid high billings.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  style={{ width: 100, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none', fontWeight: 600, textAlign: 'center' }}
                  value={ai.maxCharPerRequest ?? 5000}
                  onChange={e => updateAiSetting({ maxCharPerRequest: parseInt(e.target.value) || 5000 })}
                />
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Chars</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
