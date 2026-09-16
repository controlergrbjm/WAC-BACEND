'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';

interface ReportRow {
  No: number;
  'ID Sesi': string;
  'Tanggal & Jam Masuk': string;
  'Waktu Selesai': string;
  'Nomor Polisi': string;
  'Model / Tipe Kendaraan': string;
  'Nama Pelanggan': string;
  'No. Telepon': string;
  'Petugas Valet': string;
  'Status WAC': string;
  'Odometer (KM)': string;
  'Level BBM': string;
  'Total Item Diperiksa': number;
  'Jumlah Defect (NG)': number;
  'Rincian Temuan Kerusakan': string;
  'Pengesahan Tanda Tangan': string;
}

const PAGE_SIZE = 15;

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

export default function ReportsExportPage() {
  const { user, token, authFetch } = useAuth();

  const isHendri = user?.nik?.toUpperCase() === 'HENDRI' || user?.name?.toUpperCase() === 'HENDRI';

  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [allData, setAllData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const months = [
    { value: 'ALL', label: 'Semua Bulan (Januari - Desember)' },
    { value: '1', label: '01 - Januari' },
    { value: '2', label: '02 - Februari' },
    { value: '3', label: '03 - Maret' },
    { value: '4', label: '04 - April' },
    { value: '5', label: '05 - Mei' },
    { value: '6', label: '06 - Juni' },
    { value: '7', label: '07 - Juli' },
    { value: '8', label: '08 - Agustus' },
    { value: '9', label: '09 - September' },
    { value: '10', label: '10 - Oktober' },
    { value: '11', label: '11 - November' },
    { value: '12', label: '12 - Desember' },
  ];

  const years = [currentYear, '2025', '2024', 'ALL'];

  const fetchReportPreview = useCallback(async () => {
    if (!token || !isHendri) return;
    setLoading(true);
    try {
      let query = `format=json`;
      if (selectedYear && selectedYear !== 'ALL') query += `&year=${selectedYear}`;
      if (selectedMonth && selectedMonth !== 'ALL') query += `&month=${selectedMonth}`;
      if (selectedDate) query += `&date=${selectedDate}`;
      if (selectedStatus && selectedStatus !== 'ALL') query += `&status=${selectedStatus}`;

      const res = await authFetch(`/api/reports/export?${query}`);
      if (res.ok) {
        const json = await res.json();
        setAllData(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching report preview:', err);
    } finally {
      setLoading(false);
    }
  }, [token, isHendri, selectedYear, selectedMonth, selectedDate, selectedStatus, authFetch]);

  useEffect(() => {
    if (isHendri) fetchReportPreview();
  }, [fetchReportPreview, isHendri]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedDate, selectedStatus, searchTerm]);

  const filteredData = allData.filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row['Nomor Polisi'].toLowerCase().includes(term) ||
      row['Nama Pelanggan'].toLowerCase().includes(term) ||
      row['Model / Tipe Kendaraan'].toLowerCase().includes(term) ||
      row['Petugas Valet'].toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDownloadExcel = async () => {
    if (!token || !isHendri) return;
    setDownloading(true);
    try {
      let query = `format=excel`;
      if (selectedYear && selectedYear !== 'ALL') query += `&year=${selectedYear}`;
      if (selectedMonth && selectedMonth !== 'ALL') query += `&month=${selectedMonth}`;
      if (selectedDate) query += `&date=${selectedDate}`;
      if (selectedStatus && selectedStatus !== 'ALL') query += `&status=${selectedStatus}`;

      const res = await authFetch(`/api/reports/export?${query}`);
      if (!res.ok) throw new Error('Gagal mengunduh file Excel');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const monthLabel = selectedMonth !== 'ALL' ? `_Bulan-${selectedMonth}` : '';
      const dateLabel = selectedDate ? `_Tgl-${selectedDate}` : '';
      a.download = `Laporan_WAC_WiraToyota_${selectedYear}${monthLabel}${dateLabel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengunduh Excel');
    } finally {
      setDownloading(false);
    }
  };

  // ─── Access Control: Only HENDRI can access this page ───
  if (!isHendri) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-card" style={{
          padding: '60px 40px',
          textAlign: 'center',
          borderLeft: '4px solid rgba(239, 68, 68, 0.5)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: '#f87171'
          }}>
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            Akses Dibatasi
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto 16px' }}>
            Halaman ekspor laporan hanya dapat diakses oleh akun <strong style={{ color: 'var(--accent-amber)' }}>HENDRI</strong>. Silakan login menggunakan akun yang sesuai.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            color: '#fca5a5'
          }}>
            <i className="fa-solid fa-user-slash"></i>
            Akun Anda ({user?.name || user?.nik || 'Tidak dikenal'}) tidak memiliki izin untuk mengekspor data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '24px 28px', borderLeft: '4px solid var(--accent-amber)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                MODUL MANAJEMEN &amp; SA
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Wira Toyota BJM</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
              Tarik Laporan &amp; Ekspor Excel WAC Digital
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Pilih periode waktu (tahun, bulan, atau tanggal spesifik) untuk menarik rekap inspeksi kendaraan ke format Microsoft Excel (.xlsx) yang rapi.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* HENDRI badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--accent-amber)',
              fontWeight: 700
            }}>
              <i className="fa-solid fa-user-shield"></i>
              Akun Manager: HENDRI
            </div>
            <button
              onClick={handleDownloadExcel}
              className="btn btn-success btn-lg"
              disabled={downloading || allData.length === 0}
              style={{ fontWeight: 700 }}
            >
              {downloading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Menyiapkan Excel...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-excel" style={{ fontSize: '1.2rem' }}></i> Ekspor ke File Excel (.xlsx)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="glass-card" style={{ padding: '22px 28px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-filter" style={{ color: 'var(--accent-cyan)' }}></i>
          Kriteria Filter Data Laporan:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Tahun */}
          <div className="form-group">
            <label><i className="fa-regular fa-calendar"></i> Pilih Tahun</label>
            <select
              className="form-input"
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setSelectedDate(''); }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y === 'ALL' ? 'Semua Tahun' : `Tahun ${y}`}</option>
              ))}
            </select>
          </div>

          {/* Bulan */}
          <div className="form-group">
            <label><i className="fa-regular fa-calendar-days"></i> Pilih Bulan</label>
            <select
              className="form-input"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(''); }}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Tanggal Spesifik */}
          <div className="form-group">
            <label><i className="fa-solid fa-calendar-check"></i> Tanggal Spesifik (Opsional)</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Status Sesi */}
          <div className="form-group">
            <label><i className="fa-solid fa-list-check"></i> Status Sesi</label>
            <select
              className="form-input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="COMPLETED">Selesai &amp; Unit Out</option>
              <option value="IN_PROGRESS">Sedang Diinspeksi (In Progress)</option>
              <option value="CHECKED_OUT">Sudah Serah Terima (Checked Out)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Ditemukan <strong>{allData.length} data inspeksi</strong> untuk periode terpilih.
            {filteredData.length < allData.length && (
              <> (menampilkan <strong>{filteredData.length}</strong> setelah filter pencarian)</>
            )}
          </div>
          <button onClick={fetchReportPreview} className="btn btn-secondary btn-sm">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Muat Ulang Data
          </button>
        </div>
      </div>

      {/* Preview Data Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              Pratinjau Data Laporan ({filteredData.length} Baris)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Data ini yang akan diekspor rapi ke file Microsoft Excel</span>
          </div>

          {/* Quick Search */}
          <div style={{ minWidth: '280px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Cari plat nomor atau nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px', fontSize: '0.85rem' }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Pagination Top */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {loading ? 'Memuat...' : (
              <>Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> — Menampilkan baris {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)}</>
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
            <p>Menarik data laporan...</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-file-excel" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', color: 'var(--text-muted)' }}></i>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tidak Ada Data WAC Pada Periode Ini</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Silakan sesuaikan filter tahun, bulan, atau tanggal di atas.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tgl &amp; Jam Masuk</th>
                  <th>No. Polisi</th>
                  <th>Model Kendaraan</th>
                  <th>Pelanggan</th>
                  <th>Petugas Valet</th>
                  <th>Status</th>
                  <th>Jml Defect</th>
                  <th>Rincian Temuan</th>
                  <th>Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row['ID Sesi'] + row.No}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row.No}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{row['Tanggal & Jam Masuk']}</td>
                    <td style={{ fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}>{row['Nomor Polisi']}</td>
                    <td>{row['Model / Tipe Kendaraan']}</td>
                    <td>{row['Nama Pelanggan']}</td>
                    <td>{row['Petugas Valet']}</td>
                    <td>
                      <span className={`badge ${
                        row['Status WAC'] === 'CHECKED_OUT' ? 'badge-checked-out' : row['Status WAC'] === 'COMPLETED' ? 'badge-completed' : 'badge-in-progress'
                      }`}>
                        {row['Status WAC']}
                      </span>
                    </td>
                    <td>
                      {row['Jumlah Defect (NG)'] > 0 ? (
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                          {row['Jumlah Defect (NG)']} NG
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>0 (Nihil)</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '240px', fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row['Rincian Temuan Kerusakan']}>
                      {row['Rincian Temuan Kerusakan']}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                      {row['Pengesahan Tanda Tangan']}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
