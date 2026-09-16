'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';

interface ActiveInspection {
  sessionId: string;
  licensePlate: string;
  vehicleModel: string;
  customerName: string;
  progress: number;
  inspectorName: string;
  inspectorNik: string;
  startTime: string;
  detailsCount: number;
}

interface DashboardStats {
  totalVehicles: number;
  waiting: number;
  inspection: number;
  completed: number;
  activeInspections?: ActiveInspection[];
  activeInspection: ActiveInspection | null;
}

interface RecentSession {
  id: string;
  status: string;
  date: string;
  vehicle: {
    licensePlate: string;
    model: string;
    customerName: string;
  };
  inspector: {
    name: string;
    role: string;
  };
  stats: {
    defectsCount: number;
    photosCount: number;
    isSigned: boolean;
  };
  details: Array<{
    checkItemId: string;
    status: string;
    note: string | null;
  }>;
  photos: Array<{
    id: string;
    partName: string;
  }>;
}

export default function DashboardPage() {
  const { user, token, isLoading, authFetch } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RecentSession | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!token) return;
    if (!isBackground) setLoadingData(true);

    try {
      // 1. Fetch KPI & Active Valet Inspections
      const statsRes = await authFetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Recent Completed Valet WAC Sessions
      const histRes = await authFetch('/api/history?limit=10');
      if (histRes.ok) {
        const histData = await histRes.json();
        setRecentSessions(histData.data || []);
      }

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error('Error syncing dashboard:', err);
    } finally {
      if (!isBackground) setLoadingData(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
      return;
    }
    if (token) {
      fetchDashboardData(false);

      // Auto-refresh every 5 seconds for live sync with Valet APK
      pollTimerRef.current = setInterval(() => {
        fetchDashboardData(true);
      }, 5000);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }
  }, [token, isLoading, router, fetchDashboardData]);

  const activeList = stats?.activeInspections || (stats?.activeInspection ? [stats.activeInspection] : []);

  if (isLoading || (!stats && loadingData)) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto 16px',
          border: '3px solid rgba(56, 189, 248, 0.2)',
          borderTopColor: 'var(--accent-cyan)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ fontWeight: 600 }}>Menghubungkan ke Portal Service Advisor & Sinkron Valet APK...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Welcome & Live Status Banner */}
      <div className="glass-card" style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)',
        borderLeft: '4px solid var(--accent-cyan)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Portal Service Advisor (SA)
            </h2>
            <span className="badge badge-completed" style={{ fontSize: '0.72rem' }}>
              WIRA TOYOTA BJM
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Selamat bertugas, <strong>{user?.name || 'Tim SA'}</strong>! Memantau proses Walk Around Check yang sedang diisi tim Valet di APK Android secara real-time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.78rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block', boxShadow: '0 0 8px var(--accent-emerald)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Sinkron Terakhir:</span>
            <strong style={{ color: '#ffffff' }}>{lastSyncTime || 'Baru saja'}</strong>
          </div>

          <button 
            onClick={() => fetchDashboardData(false)} 
            className="btn btn-secondary btn-sm"
            title="Refresh data sekarang"
          >
            <i className={`fa-solid fa-arrows-rotate ${loadingData ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px'
      }}>
        {/* KPI 1: Sedang Di-WAC Valet */}
        <div className="glass-card" style={{
          padding: '20px',
          border: activeList.length > 0 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-color)',
          background: activeList.length > 0 ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SEDANG DI-WAC VALET (LIVE)
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {activeList.length}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-screwdriver-wrench"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Sedang diperiksa di aplikasi HP valet
          </div>
        </div>

        {/* KPI 2: Total Selesai WAC Hari Ini */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SELESAI WAC & UNIT OUT
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {stats?.completed ?? 0}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Laporan lengkap & siap / sudah serah terima
          </div>
        </div>

        {/* KPI 3: Total Unit Tercatat Hari Ini */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOTAL KENDARAAN HARI INI
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {stats?.totalVehicles ?? 0}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-car"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Total unit masuk bengkel & diperiksa
          </div>
        </div>

        {/* KPI 4: Pintasan Laporan Excel */}
        <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                EKSPOR LAPORAN
              </span>
              <div style={{ marginTop: '6px' }}>
                <Link href="/reports" className="btn btn-secondary btn-sm" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', color: '#ffffff' }}>
                  <i className="fa-solid fa-file-excel" style={{ color: 'var(--accent-amber)' }}></i> Download Excel
                </Link>
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-download"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Tarik data per tahun, bulan, & tanggal
          </div>
        </div>
      </div>

      {/* LIVE SECTION: KENDARAAN SEDANG DI-WAC TIM VALET (LIVE STREAMING) */}
      <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                LIVE MONITORING VALET
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                Kendaraan Sedang Dalam Proses Walk Around Check (WAC)
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Mobil yang saat ini sedang diinspeksi oleh tim Valet di lapangan melalui aplikasi Android. Begitu Valet memulai WAC di HP, data nomor polisi dan progres langsung muncul di sini.
            </p>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Auto-refresh setiap 5 detik
          </span>
        </div>

        {activeList.length === 0 ? (
          <div style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 12px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              fontSize: '1.5rem'
            }}>
              <i className="fa-solid fa-satellite-dish"></i>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              Tidak Ada Unit yang Sedang Diinspeksi Valet Saat Ini
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '480px', margin: '6px auto 0' }}>
              Saat tim Valet menekan tombol <strong>Mulai Sesi WAC</strong> di aplikasi Android mereka, data nomor polisi dan progres kendaraan akan otomatis muncul di kartu ini secara langsung.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {activeList.map((item) => (
              <div
                key={item.sessionId}
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  position: 'relative'
                }}
              >
                {/* Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      NOMOR POLISI ARMADA
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.5px' }}>
                      {item.licensePlate}
                    </div>
                  </div>
                  <span className="badge badge-in-progress" style={{ fontSize: '0.72rem' }}>
                    <i className="fa-solid fa-spinner fa-spin"></i> PROSES VALET
                  </span>
                </div>

                {/* Info row */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  <div><strong>Model:</strong> {item.vehicleModel}</div>
                  <div><strong>Pelanggan:</strong> {item.customerName}</div>
                  <div>
                    <strong>Petugas Valet:</strong>{' '}
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{item.inspectorName}</span>
                    {item.inspectorNik ? ` (${item.inspectorNik})` : ''}
                  </div>
                  {item.startTime && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Mulai: {new Date(item.startTime).toLocaleTimeString('id-ID')}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Checklist Diperiksa</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{item.detailsCount} item ({item.progress}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(5, item.progress)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HASIL WAC MASUK DARI VALET (COMPLETED & SIAP SERAH TERIMA) */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              Hasil WAC Selesai dari Tim Valet
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Daftar kendaraan yang telah selesai diperiksa oleh tim Valet di aplikasi Android. Tim SA dapat meninjau temuan defect & tanda tangan atau memproses serah terima.
            </p>
          </div>
          <Link href="/history" className="btn btn-secondary btn-sm">
            Lihat Seluruh Arsip <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada riwayat hasil inspeksi yang selesai.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu Selesai</th>
                  <th>Plat Nomor</th>
                  <th>Model Kendaraan</th>
                  <th>Pelanggan</th>
                  <th>Petugas Valet</th>
                  <th>Hasil Defect</th>
                  <th>Status</th>
                  <th>Aksi Tim SA</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => {
                  const isCompleted = session.status === 'COMPLETED';
                  const isOut = session.status === 'CHECKED_OUT';
                  return (
                    <tr key={session.id}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {new Date(session.date).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ fontWeight: 800, color: '#ffffff' }}>
                        {session.vehicle.licensePlate}
                      </td>
                      <td>{session.vehicle.model}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{session.vehicle.customerName}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{session.inspector.name}</span>
                      </td>
                      <td>
                        {session.stats.defectsCount > 0 ? (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> {session.stats.defectsCount} Defect (NG)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            <i className="fa-solid fa-check"></i> Nihil Defect
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          isOut ? 'badge-checked-out' : isCompleted ? 'badge-completed' : 'badge-in-progress'
                        }`}>
                          {isOut ? 'UNIT OUT' : isCompleted ? 'SELESAI VALET' : session.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedSession(session)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 10px' }}
                          >
                            <i className="fa-solid fa-eye"></i> Detail WAC
                          </button>
                          {isCompleted && (
                            <Link
                              href="/sa"
                              className="btn btn-primary btn-sm"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            >
                              Unit Out
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK DETAIL MODAL FOR SA */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '720px', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  Rincian Hasil WAC Valet
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Plat: {selectedSession.vehicle.licensePlate}</span>
              </div>
              <button type="button" onClick={() => setSelectedSession(null)} className="btn btn-secondary btn-sm">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Info Summary Box */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No. Polisi</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>{selectedSession.vehicle.licensePlate}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedSession.vehicle.model}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pelanggan</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{selectedSession.vehicle.customerName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Petugas Valet</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{selectedSession.inspector.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status Kelayakan</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge ${selectedSession.stats.defectsCount > 0 ? 'badge-warning' : 'badge-completed'}`}>
                    {selectedSession.stats.defectsCount > 0 ? 'PERLU PERBAIKAN' : 'LAYAK OPERASIONAL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Temuan Kerusakan */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                Temuan Kerusakan Eksterior ({selectedSession.photos.length})
              </h4>
              {selectedSession.photos.length === 0 ? (
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)', fontSize: '0.82rem' }}>
                  ✓ Nihil catatan kerusakan eksterior (Bersih).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedSession.photos.map((p, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                      <strong style={{ color: 'var(--accent-cyan)' }}>#{idx + 1}</strong> {p.partName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checklist summary */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                Ringkasan Checklist Item ({selectedSession.details.length})
              </h4>
              {selectedSession.details.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Belum ada checklist tersimpan.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {selectedSession.details.slice(0, 8).map((d, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Item #{idx + 1}</span>
                      <span className={`badge ${d.status === 'OK' ? 'badge-completed' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>{d.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedSession(null)}>
                Tutup
              </button>
              <Link href="/history" className="btn btn-primary">
                Buka Laporan Lengkap
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
