// AdminDashboard.jsx — LinguaLink Admin Control Centre
import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Activity,
  BarChart2, Settings, LogOut, Moon, Sun,
  Cpu, ChevronRight, Shield, Radio,
  Bell, Search, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminChatLogs from '../components/admin/AdminChatLogs';
import AdminActivity from '../components/admin/AdminActivity';
import AdminReports from '../components/admin/AdminReports';
import AdminAISettings from '../components/admin/AdminAISettings';
import '../admin.css';

const NAV_ITEMS = [
  {
    section: 'Dashboard',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Stats & charts' },
      { id: 'activity', label: 'User Activity', icon: Activity, desc: 'Live presence' },
    ]
  },
  {
    section: 'Management',
    items: [
      { id: 'users', label: 'Users', icon: Users, desc: 'Block, edit, promote' },
      { id: 'chatlogs', label: 'Reported Msgs', icon: Shield, desc: 'Moderation queue' },
    ]
  },
  {
    section: 'Reports & Config',
    items: [
      { id: 'reports', label: 'Analytics', icon: BarChart2, desc: 'Generate report' },
      { id: 'ai', label: 'AI & Translation', icon: Cpu, desc: 'Engine config' },
    ]
  },
];

const PAGE_TITLES = {
  overview: { title: 'Overview', subtitle: 'System health & platform statistics' },
  activity: { title: 'User Activity', subtitle: 'Real-time presence & engagement metrics' },
  users: { title: 'User Management', subtitle: 'Manage accounts, roles & permissions' },
  chatlogs: { title: 'Reported Messages', subtitle: 'Review and moderate flagged content' },
  reports: { title: 'Analytics & Reports', subtitle: 'Insights, trends & data exports' },
  ai: { title: 'AI & Translation', subtitle: 'Configure AI engines & language settings' },
};

export default function AdminDashboard() {
  const { user, logout, darkMode, setDarkMode } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user || user.role !== 'admin') {
    return <Navigate to={user ? '/chat' : '/admin'} />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  const PANEL_MAP = {
    overview: <AdminOverview />,
    users: <AdminUsers />,
    activity: <AdminActivity />,
    chatlogs: <AdminChatLogs />,
    reports: <AdminReports />,
    ai: <AdminAISettings />,
  };

  const pageInfo = PAGE_TITLES[activeTab] || PAGE_TITLES.overview;

  return (
    <div className={`ll-admin-layout ${darkMode ? 'dark' : ''}`}>

      {/* ═══════════════════════════════
          SIDEBAR
      ═══════════════════════════════ */}
      <motion.aside
        className="ll-admin-sidebar"
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        {/* Logo Header */}
        <div className="ll-sidebar-brand">
          <img
            src="/features/logo.PNG"
            alt="LinguaLink Logo"
            className="ll-brand-logo"
          />
          <div className="ll-brand-text">
            <span className="ll-brand-name">LinguaLink</span>
            <span className="ll-brand-sub">Admin Console</span>
          </div>
        </div>

        {/* Admin Badge */}
        <div className="ll-admin-identity">
          <div className="ll-identity-avatar">
            {(user.name?.[0] || 'A').toUpperCase()}
          </div>
          <div className="ll-identity-info">
            <div className="ll-identity-name">{user.name}</div>
            <div className="ll-identity-role">
              <span className="ll-role-dot" />
              Super Admin
            </div>
          </div>
          <div className="ll-identity-badge">
            <Shield size={12} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="ll-sidebar-nav">
          {NAV_ITEMS.map(section => (
            <div key={section.section} className="ll-nav-section">
              <div className="ll-nav-section-label">{section.section}</div>
              {section.items.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    className={`ll-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`ll-nav-icon ${isActive ? 'active' : ''}`}>
                      <item.icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="ll-nav-label">
                      <span className="ll-nav-text">{item.label}</span>
                      <span className="ll-nav-desc">{item.desc}</span>
                    </div>
                    {isActive && (
                      <ChevronRight size={14} style={{ opacity: 0.5, marginLeft: 'auto', flexShrink: 0 }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="ll-sidebar-footer">
          <button className="ll-footer-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="ll-footer-btn danger" onClick={handleLogout}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* ═══════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════ */}
      <div className="ll-admin-main">

        {/* Top Bar */}
        <header className="ll-admin-topbar">
          <div className="ll-topbar-left">
            <div className="ll-topbar-breadcrumb">
              <span className="ll-breadcrumb-root" onClick={() => setActiveTab('overview')} style={{ cursor: 'pointer' }}>Admin</span>
              <ChevronRight size={14} style={{ opacity: 0.4 }} />
              <span className="ll-breadcrumb-current">{pageInfo.title}</span>
            </div>
            <h1 className="ll-topbar-title">{pageInfo.title}</h1>
          </div>

          <div className="ll-topbar-right">
            <div className="ll-topbar-time">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="ll-topbar-divider" />
            <div className="ll-topbar-user">
              <div className="ll-topbar-avatar">
                {(user.name?.[0] || 'A').toUpperCase()}
              </div>
              <div className="ll-topbar-user-info">
                <span className="ll-topbar-user-name">{user.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="ll-admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {PANEL_MAP[activeTab] || <AdminOverview />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
