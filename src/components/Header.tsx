'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Monitoring Valet & Sesi WAC';
    if (pathname.includes('/history')) return 'Hasil WAC Masuk dari Valet';
    if (pathname.includes('/sa')) return 'Serah Terima Kendaraan (Unit Out)';
    if (pathname.includes('/reports')) return 'Laporan & Ekspor Excel';
    return 'Portal Service Advisor';
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={onMenuToggle}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '8px' }}
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
            {getPageTitle()}
          </h1>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Service Advisor Command Center • Wira Toyota BJM
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Live Sync Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-emerald)',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent-emerald)',
            boxShadow: '0 0 8px var(--accent-emerald)',
            display: 'inline-block',
          }} />
          Sinkron APK Android
        </div>

        {/* Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <i className="fa-regular fa-clock" style={{ color: 'var(--accent-cyan)' }}></i>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {currentTime || 'Memuat...'}
          </span>
        </div>
      </div>
    </header>
  );
};
