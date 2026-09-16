'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';

export default function LoginPage() {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal masuk. Periksa NIK dan Password.');
      }

      login(data.data.token, data.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan pada sistem');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setNik('123456789');
    setPassword('password123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Background glow circle */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)'
          }}>
            <i className="fa-solid fa-truck-monster"></i>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            WAC DIGITAL
          </h2>
          <p style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
            Wira Toyota BJM • Portal SA & Manajemen
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
            Sinkron Real-time dengan Aplikasi Android Valet
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1.1rem' }}></i>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label htmlFor="nik"><i className="fa-solid fa-id-card"></i> NIK Petugas / Username</label>
            <input
              id="nik"
              type="text"
              className="form-input"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="Contoh: SA atau HENDRI"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password"><i className="fa-solid fa-lock"></i> Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Memverifikasi...
              </>
            ) : (
              <>
                Masuk ke Portal SA <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
