'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';

interface HistoryItem {
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
    status: 'OK' | 'NG' | 'WARNING';
    note: string | null;
  }>;
  photos: Array<{
    id: string;
    photoUrl: string;
    partName: string;
    isExterior: boolean;
  }>;
  signatures: Array<{
    signerName: string;
    role: string;
    signatureUrl: string;
    verifiedAt: string;
  }>;
}

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { token, authFetch } = useAuth();
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `/api/history?limit=${PAGE_SIZE}&page=${currentPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') url += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await authFetch(url);
      if (res.ok) {
        const json = await res.json();
        setHistoryList(json.data || []);
        // API returns pagination object with total
        setTotalCount(json.pagination?.total ?? json.total ?? json.data?.length ?? 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, currentPage, authFetch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Filter Controls */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Riwayat &amp; Arsip Laporan WAC
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Daftar seluruh sesi pemeriksaan kendaraan Walk Around Check yang telah direkam.
            </p>
          </div>
          <button onClick={fetchHistory} className="btn btn-secondary btn-sm">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '260px', display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Cari plat nomor, model armada, atau inspector..."
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

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: 'Semua Status' },
              { key: 'COMPLETED', label: 'Selesai' },
              { key: 'IN_PROGRESS', label: 'Sedang Proses' },
              { key: 'CHECKED_OUT', label: 'Unit Out' },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setStatusFilter(btn.key)}
                className={`btn btn-sm ${statusFilter === btn.key ? 'btn-primary' : 'btn-secondary'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Data Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* Table Info & Pagination Top */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {loading ? 'Memuat...' : (
              <>Menampilkan <strong>{historyList.length}</strong> dari <strong>{totalCount}</strong> data — Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></>
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
            <p>Memuat riwayat sesi...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }}></i>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tidak Ada Data Ditemukan</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Coba ubah kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal &amp; Jam</th>
                  <th>Plat Nomor</th>
                  <th>Armada / Model</th>
                  <th>Pelanggan</th>
                  <th>Petugas Valet</th>
                  <th>Temuan Defect</th>
                  <th>Tanda Tangan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((item, idx) => {
                  const isCompleted = item.status === 'COMPLETED';
                  const isOut = item.status === 'CHECKED_OUT';
                  const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{rowNum}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(item.date).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                        {item.vehicle.licensePlate}
                      </td>
                      <td>{item.vehicle.model}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.vehicle.customerName}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.inspector.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', display: 'block' }}>{item.inspector.role}</span>
                      </td>
                      <td>
                        {item.stats.defectsCount > 0 ? (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> {item.stats.defectsCount} Defect
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            <i className="fa-solid fa-check"></i> Nihil
                          </span>
                        )}
                      </td>
                      <td>
                        {item.stats.isSigned ? (
                          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-signature"></i> Ditandatangani
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Belum
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          isOut ? 'badge-checked-out' : isCompleted ? 'badge-completed' : 'badge-in-progress'
                        }`}>
                          {isOut ? 'UNIT OUT' : isCompleted ? 'SELESAI' : item.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedSession(item)}
                          className="btn btn-secondary btn-sm"
                        >
                          <i className="fa-solid fa-file-lines"></i> Rincian
                        </button>
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

      {/* DETAIL & AUDIT MODAL (PRINT READY) */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  Laporan Audit Walk Around Check (WAC)
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID Sesi: {selectedSession.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" onClick={handlePrint} className="btn btn-secondary btn-sm">
                  <i className="fa-solid fa-print"></i> Cetak / Print
                </button>
                <button type="button" onClick={() => setSelectedSession(null)} className="btn btn-secondary btn-sm">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Vehicle & Audit Info Box */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nomor Polisi</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  {selectedSession.vehicle.licensePlate}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedSession.vehicle.model}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer / Perusahaan</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  {selectedSession.vehicle.customerName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Waktu: {new Date(selectedSession.date).toLocaleString('id-ID')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Petugas Inspeksi</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  {selectedSession.inspector.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>Role: {selectedSession.inspector.role}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status Sesi</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge ${
                    selectedSession.status === 'COMPLETED' ? 'badge-completed' : selectedSession.status === 'CHECKED_OUT' ? 'badge-checked-out' : 'badge-in-progress'
                  }`}>
                    {selectedSession.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Defect Pins Box */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--accent-amber)' }}></i>
                Temuan Kerusakan Eksterior ({selectedSession.photos.length})
              </h4>
              {selectedSession.photos.length === 0 ? (
                <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                  <i className="fa-solid fa-circle-check"></i> Tidak ada catatan kerusakan eksterior (Kondisi Bersih / Nihil Defect).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedSession.photos.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.88rem'
                      }}
                    >
                      <strong style={{ color: 'var(--accent-cyan)' }}>#{idx + 1}</strong> {item.partName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checklist items summary */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-list-check" style={{ color: 'var(--accent-cyan)' }}></i>
                Evaluasi Checklist Komponen ({selectedSession.details.length} Item)
              </h4>
              {selectedSession.details.length === 0 ? (
                <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Checklist item belum diverifikasi.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {selectedSession.details.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem'
                      }}
                    >
                      <span>Item #{i + 1}: {d.note || 'Pemeriksaan standar'}</span>
                      <span className={`badge ${d.status === 'OK' ? 'badge-completed' : 'badge-danger'}`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signatures */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-signature" style={{ color: 'var(--accent-emerald)' }}></i>
                Verifikasi Tanda Tangan
              </h4>
              {selectedSession.signatures.length === 0 ? (
                <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Belum ada tanda tangan yang dibubuhkan pada sesi ini.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {selectedSession.signatures.map((sig, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '16px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        minWidth: '220px'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '6px' }}>
                        ✓ DIGITAL SIGNATURE VERIFIED
                      </div>
                      <div style={{ fontWeight: 800, color: '#ffffff' }}>{sig.signerName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Role: {sig.role}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Waktu: {new Date(sig.verifiedAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedSession(null)}>
                Tutup
              </button>
            </div>
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
