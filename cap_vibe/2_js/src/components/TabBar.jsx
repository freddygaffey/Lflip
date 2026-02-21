import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/history', icon: '📋', label: 'Logbook' },
  { path: '/car', icon: '🚗', label: 'Car' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const hidden = ['/active', '/start', '/stop'].some((p) => location.pathname.startsWith(p));
  if (hidden) return null;

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const active = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
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
