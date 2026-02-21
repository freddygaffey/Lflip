import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Tab {
  path: string;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { path: '/',          icon: '🏠', label: 'Home' },
  { path: '/history',   icon: '📋', label: 'Logbook' },
  { path: '/device',    icon: '📡', label: 'Device' },
  { path: '/sync',      icon: '☁️', label: 'Sync' },
  { path: '/settings',  icon: '⚙️', label: 'Settings' },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide tab bar on active-trip, start, stop screens
  const hidden = ['/active', '/start', '/stop'].some((p) => location.pathname.startsWith(p));
  if (hidden) return null;

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const active = tab.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`tab-item ${active ? 'active' : ''}`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
