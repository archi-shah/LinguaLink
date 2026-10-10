import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ShieldCheck, Globe, HardDrive, ShieldAlert, Zap, Globe2, Save, Server, Loader2, CheckCircle2 } from 'lucide-react';

export default function AdminSystemConfig() {
  const [configs, setConfigs] = useState(() => {
    const saved = localStorage.getItem('ll_system_config');
    if (saved) return JSON.parse(saved);
    return {
      maintenanceMode: false,
      publicRegistration: true,
      requireEmailVerification: true,
      maxUploadSize: 50,
      defaultLanguage: 'en',
      dataRetentionDays: 90,
      maxGroupMembers: 256
    };
  });

  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  const toggle = (key) => setConfigs(prev => ({ ...prev, [key]: !prev[key] }));
  
  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('ll_system_config', JSON.stringify(configs));
    setTimeout(() => {
      setSaving(false);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    }, 800);
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ background: 'var(--ll-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>Master Configuration</h1>
          <p className="admin-page-subtitle">Global platform overrides, maintenance flags, and core operational limits.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="admin-btn-primary" 
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '14px', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
        >
          {saving ? <Loader2 size={16} className="spinner" /> : (savedTick ? <CheckCircle2 size={16} /> : <Save size={16} />)}
          {saving ? 'Applying...' : (savedTick ? 'Saved Locally' : 'Save Configuration')}
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Security & Access */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="admin-card"
          style={{ background: 'var(--ll-bg-card)', border: '1px solid var(--ll-border)', overflow: 'hidden' }}
        >
          <div style={{ padding: '24px', borderBottom: '1px solid var(--ll-border)', background: 'linear-gradient(to right, rgba(239, 68, 68, 0.05), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '12px', color: '#ef4444' }}>
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ll-text-1)', fontFamily: 'Outfit' }}>Security & Pipeline</h3>
            </div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '4px' }}>Maintenance Mode</label>
                <div style={{ fontSize: '12px', color: 'var(--ll-text-3)' }}>Blocks all non-admin logins instantly.</div>
              </div>
              <label className="admin-toggle"><input type="checkbox" checked={configs.maintenanceMode} onChange={() => toggle('maintenanceMode')} /><span className="admin-toggle-slider" style={{ background: configs.maintenanceMode ? '#ef4444' : '' }}></span></label>
            </div>
            <div style={{ height: '1px', background: 'var(--ll-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '4px' }}>Public Registration</label>
                <div style={{ fontSize: '12px', color: 'var(--ll-text-3)' }}>Allow new users to sign up natively.</div>
              </div>
              <label className="admin-toggle"><input type="checkbox" checked={configs.publicRegistration} onChange={() => toggle('publicRegistration')} /><span className="admin-toggle-slider"></span></label>
            </div>
            <div style={{ height: '1px', background: 'var(--ll-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '4px' }}>Strict 2FA Verification</label>
                <div style={{ fontSize: '12px', color: 'var(--ll-text-3)' }}>Require OTP via email/sms for setup.</div>
              </div>
              <label className="admin-toggle"><input type="checkbox" checked={configs.requireEmailVerification} onChange={() => toggle('requireEmailVerification')} /><span className="admin-toggle-slider"></span></label>
            </div>
          </div>
        </motion.div>

        {/* Global Architecture */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="admin-card"
          style={{ background: 'var(--ll-bg-card)', border: '1px solid var(--ll-border)', overflow: 'hidden' }}
        >
          <div style={{ padding: '24px', borderBottom: '1px solid var(--ll-border)', background: 'linear-gradient(to right, rgba(76, 116, 249, 0.05), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(76, 116, 249, 0.1)', padding: '10px', borderRadius: '12px', color: '#4C74F9' }}>
                <Globe2 size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ll-text-1)', fontFamily: 'Outfit' }}>Platform Semantics</h3>
            </div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '8px' }}>Default System Localization</label>
              <select 
                value={configs.defaultLanguage} 
                onChange={(e) => setConfigs({ ...configs, defaultLanguage: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--ll-bg-elem)', border: '1px solid var(--ll-border)', borderRadius: '10px', color: 'var(--ll-text-1)', outline: 'none', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="en">🇺🇸 English (US)</option>
                <option value="es">🇪🇸 Spanish (ES)</option>
                <option value="fr">🇫🇷 French (FR)</option>
                <option value="hi">🇮🇳 Hindi (IN)</option>
                <option value="ja">🇯🇵 Japanese (JP)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '8px' }}>WebSocket Sub-Channel Capacity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="range" min="10" max="1000" step="10"
                  value={configs.maxGroupMembers} 
                  onChange={(e) => setConfigs({ ...configs, maxGroupMembers: parseInt(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--ll-blue)' }}
                />
                <span style={{ background: 'var(--ll-bg-elem)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--ll-text-1)', border: '1px solid var(--ll-border)', minWidth: '60px', textAlign: 'center' }}>
                  {configs.maxGroupMembers}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ll-text-3)', marginTop: '8px' }}>Max members allowed per community namespace.</div>
            </div>
          </div>
        </motion.div>

        {/* Server & Storage Limits */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="admin-card"
          style={{ background: 'var(--ll-bg-card)', border: '1px solid var(--ll-border)', overflow: 'hidden' }}
        >
          <div style={{ padding: '24px', borderBottom: '1px solid var(--ll-border)', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.05), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px', color: '#10B981' }}>
                <Database size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ll-text-1)', fontFamily: 'Outfit' }}>Storage Quantities</h3>
            </div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '8px' }}>
                <span>Max Payload Limit (MB)</span>
                <span style={{ color: 'var(--ll-text-3)', fontSize: '12px', fontWeight: 500 }}>Per request</span>
              </label>
              <div style={{ position: 'relative' }}>
                <HardDrive size={16} color="var(--ll-text-3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="number" 
                  value={configs.maxUploadSize} 
                  onChange={(e) => setConfigs({ ...configs, maxUploadSize: parseInt(e.target.value) })}
                  style={{ width: '100%', background: 'var(--ll-bg-elem)', border: '1px solid var(--ll-border)', borderRadius: '10px', color: 'var(--ll-text-1)', padding: '12px 16px 12px 42px', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--ll-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--ll-border)'}
                />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 600, color: 'var(--ll-text-1)', marginBottom: '8px' }}>
                <span>Message TTL (Days)</span>
                <span style={{ color: 'var(--ll-text-3)', fontSize: '12px', fontWeight: 500 }}>Retention protocol</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Server size={16} color="var(--ll-text-3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="number" 
                  value={configs.dataRetentionDays} 
                  onChange={(e) => setConfigs({ ...configs, dataRetentionDays: parseInt(e.target.value) })}
                  style={{ width: '100%', background: 'var(--ll-bg-elem)', border: '1px solid var(--ll-border)', borderRadius: '10px', color: 'var(--ll-text-1)', padding: '12px 16px 12px 42px', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--ll-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--ll-border)'}
                />
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
