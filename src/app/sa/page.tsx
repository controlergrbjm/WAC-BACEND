'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';

interface SaSession {
  id: string;
  status: string;
  createdAt: string;
  vehicle: {
    licensePlate: string;
    model: string;
    color: string;
    customerName: string;
    customerPhone: string;
  };
  inspector: {
    name: string;
    role: string;
    nik: string;
  };
  stats: {
    okCount: number;
    ngCount: number;
    photosCount: number;
    isSigned: boolean;
  };
  checklist: Array<{
    itemName: string;
    category: string;
    status: string;
    note: string;
  }>;
  photos: Array<{
    id: string;
    partName: string;
  }>;
}

const PAGE_SIZE = 10;

export default function SaUnitOutPage() {
  const { user, token, authFetch } = useAuth();
  const [sessions, setSessions] = useState<SaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSession, setSelectedSession] = useState<SaSession | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchSaResults = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `/api/sa/valet-results?limit=${PAGE_SIZE}&page=${currentPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await authFetch(url);
      if (res.ok) {
        const json = await res.json();
        setSessions(json.data || []);
        setTotalCount(json.pagination?.total ?? json.total ?? json.data?.length ?? 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, search, currentPage, authFetch]);

  useEffect(() => {
    fetchSaResults();
  }, [fetchSaResults]);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleConfirmUnitOut = async (sessionId: string) => {
    setCheckingOut(true);
    try {
      const res = await authFetch('/api/wac/check-out', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          signatureUrl: `https://wac-digital.local/signatures/unit-out-${sessionId}.png`,
          signerName: user?.name || 'Service Advisor',
          role: user?.role || 'SERVICE_ADVISOR',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal melakukan check-out unit');
      }

      setSuccessMessage('Kendaraan berhasil diserahterimakan (Unit Out)!');
      setSelectedSession(null);
      fetchSaResults();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat check-out');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Service Advisor &amp; Serah Terima (Unit Out)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Monitoring hasil inspeksi WAC dan verifikasi serah terima kendaraan kepada pelanggan.
            </p>
          </div>
          <button onClick={fetchSaResults} className="btn btn-secondary btn-sm">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#6ee7b7',
            fontSize: '0.88rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fa-solid fa-circle-check"></i>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} style={{ maxWidth: '480px', display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Cari plat nomor atau pelanggan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px' }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Cari
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }} className="btn btn-secondary btn-sm">
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </form>
      </div>

      {/* Unit Out Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* Table info & Pagination Top */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {loading ? 'Memuat...' : (
              <>Menampilkan <strong>{sessions.length}</strong> dari <strong>{totalCount}</strong> unit — Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></>
            )}
          </div>
          <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              margin: '0 auto 12px',
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: 'var(--accent-cyan)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p>Memuat daftar unit keluar...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-truck-ramp-box" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }}></i>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tidak Ada Kendaraan Siap Serah Terima</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Unit yang telah selesai diinspeksi (COMPLETED) akan muncul di sini.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Plat Nomor</th>
                  <th>Armada / Model</th>
                  <th>Pelanggan</th>
                  <th>Inspector Valet</th>
                  <th>Hasil Checklist</th>
                  <th>Status Sesi</th>
                  <th>Aksi Serah Terima</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((item, idx) => {
                  const isReadyOut = item.status === 'COMPLETED';
                  const isCheckedOut = item.status === 'CHECKED_OUT';
                  const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{rowNum}</td>
                      <td style={{ fontWeight: 800, color: '#ffffff' }}>
                        {item.vehicle.licensePlate}
                      </td>
                      <td>{item.vehicle.model}</td>
                      <td>{item.vehicle.customerName}</td>
                      <td>{item.inspector.name}</td>
                      <td>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, marginRight: '10px' }}>
                          ✓ {item.stats.okCount} OK
                        </span>
                        {item.stats.ngCount > 0 && (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                            ⚠ {item.stats.ngCount} Perlu Perhatian
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isCheckedOut ? 'badge-checked-out' : 'badge-completed'}`}>
                          {isCheckedOut ? 'SUDAH KELUAR' : 'SIAP UNIT OUT'}
                        </span>
                      </td>
                      <td>
                        {isReadyOut ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSession(item)}
                            className="btn btn-primary btn-sm"
                          >
                            <i className="fa-solid fa-truck-arrow-right"></i> Proses Unit Out
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedSession(item)}
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="fa-solid fa-eye"></i> Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bottom */}
        {!loading && totalPages > 1 && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* Confirmation & Inspection Review Modal */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Verifikasi Serah Terima Kendaraan (Unit Out)
            </h3>

            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Plat Nomor:</span>
                <strong style={{ color: '#ffffff' }}>{selectedSession.vehicle.licensePlate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Armada:</span>
                <span>{selectedSession.vehicle.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pelanggan:</span>
                <span>{selectedSession.vehicle.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inspector:</span>
                <span>{selectedSession.inspector.name} ({selectedSession.inspector.role})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Temuan Defect:</span>
                <span style={{ color: selectedSession.photos.length > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)', fontWeight: 700 }}>
                  {selectedSession.photos.length} Titik
                </span>
              </div>
            </div>

            {selectedSession.status === 'COMPLETED' ? (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Apakah Anda yakin ingin memproses check-out serah terima unit ini? Status sesi akan diubah menjadi <strong>CHECKED_OUT</strong>.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedSession(null)}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={checkingOut}
                    onClick={() => handleConfirmUnitOut(selectedSession.id)}
                  >
                    {checkingOut ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check-double"></i> Konfirmasi Unit Out
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: 'var(--radius-sm)', color: '#c084fc', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <i className="fa-solid fa-circle-check"></i> Kendaraan ini sudah berstatus CHECKED_OUT.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedSession(null)}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable Pagination Component ── */
function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn btn-secondary btn-sm"
        style={{ padding: '5px 10px', opacity: currentPage === 1 ? 0.4 : 1 }}
      >
        <i className="fa-solid fa-chevron-left"></i>
      </button>

      {getPageNumbers().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '5px 10px', minWidth: '36px' }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn btn-secondary btn-sm"
        style={{ padding: '5px 10px', opacity: currentPage === totalPages ? 0.4 : 1 }}
      >
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  );
}
