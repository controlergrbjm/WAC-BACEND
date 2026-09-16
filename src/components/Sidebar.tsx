'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isHendri = user?.nik?.toUpperCase() === 'HENDRI' || user?.name?.toUpperCase() === 'HENDRI';

  const navItems = [
    { href: '/dashboard', label: 'Monitoring SA', icon: 'fa-solid fa-chart-line', hendriOnly: false },
    { href: '/history', label: 'Hasil WAC Masuk', icon: 'fa-solid fa-clipboard-list', hendriOnly: false },
    { href: '/sa', label: 'Serah Terima (Unit Out)', icon: 'fa-solid fa-car-side', hendriOnly: false },
    { href: '/reports', label: 'Laporan & Ekspor Excel', icon: 'fa-solid fa-file-excel', hendriOnly: true },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 45
          }}
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Logo */}
        <div className="sidebar-logo">
          <div className="icon-box">
            <i className="fa-solid fa-truck-monster"></i>
          </div>
          <div>
            <h2>WAC DIGITAL</h2>
            <span>Portal Service Advisor</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '8px 16px', letterSpacing: '0.5px' }}>
            Menu Service Advisor
          </div>
          {navItems.map((item) => {
            // Hide Laporan menu for non-HENDRI users
            if (item.hendriOnly && !isHendri) return null;

            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
                {item.hendriOnly && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--accent-amber)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>HENDRI</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Bar */}
        <div className="sidebar-user">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="user-avatar">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'SA'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Tim SA'}
              </div>
              <div style={{ fontSize: '0.72rem', color: isHendri ? 'var(--accent-amber)' : 'var(--accent-cyan)' }}>
                {isHendri ? '★ Manager Laporan' : (user?.role || 'SERVICE_ADVISOR')}
              </div>
            </div>
          </div>
          <button 
            onClick={logout} 
            title="Keluar / Logout"
            style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: '6px' }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </aside>
    </>
  );
};
