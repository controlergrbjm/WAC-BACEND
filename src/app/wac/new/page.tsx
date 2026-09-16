'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthContext';

interface DefectPin {
  id: string;
  side: 'right' | 'front' | 'left' | 'rear';
  positionPercentX: number;
  positionPercentY: number;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
}

interface ChecklistItem {
  itemId: string;
  itemName: string;
  category: string;
  targetSide: string;
  isPassed: boolean;
  note: string;
}

export default function NewWacPage() {
  const { user, token, authFetch } = useAuth();
  const router = useRouter();

  // Wizard Step
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Session & Vehicle Details
  const [licensePlate, setLicensePlate] = useState('B 9872 UCH');
  const [customerName, setCustomerName] = useState('PT Logistics Nusantara');
  const [vehicleModel, setVehicleModel] = useState('Heavy Duty Truck');
  const [odometer, setOdometer] = useState('142580');
  const [fuelLevel, setFuelLevel] = useState('3/4');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Step 2: Pins & Exterior Diagram
  const [currentAngle, setCurrentAngle] = useState<'right' | 'front' | 'left' | 'rear'>('right');
  const [pins, setPins] = useState<DefectPin[]>([]);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ x: number; y: number } | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalSeverity, setModalSeverity] = useState<'minor' | 'major' | 'critical'>('minor');

  // Step 3: Standard Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { itemId: '1', itemName: 'Kedalaman Alur Ban & Baut Roda', category: 'Ban & Velg', targetSide: 'All', isPassed: true, note: '' },
    { itemId: '2', itemName: 'Lampu Utama & Sinyal Indikator', category: 'Lampu & Sinyal', targetSide: 'Depan & Belakang', isPassed: true, note: '' },
    { itemId: '3', itemName: 'Tekanan Angin & Fungsi Handbrake', category: 'Sistem Rem', targetSide: 'Internal', isPassed: true, note: '' },
    { itemId: '4', itemName: 'Level Oli Mesin & Air Radiator', category: 'Mesin & Fluida', targetSide: 'Kap Mesin', isPassed: true, note: '' },
    { itemId: '5', itemName: 'APAR, Kotak P3K, & Segitiga Pengaman', category: 'Keselamatan', targetSide: 'Kabin', isPassed: true, note: '' },
    { itemId: '6', itemName: 'Kondisi Kaca Spion & Wiper', category: 'Visibilitas', targetSide: 'Depan', isPassed: true, note: '' },
  ]);

  // Step 4: Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canvas drawing handlers
  useEffect(() => {
    if (currentStep === 4 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [currentStep]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  // Step 1 Submit: Check-in with Backend
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Get or create vehicle
      const vehRes = await authFetch(
        `/api/wac/vehicles?plate=${encodeURIComponent(licensePlate)}&customerName=${encodeURIComponent(customerName)}&vehicleType=${encodeURIComponent(vehicleModel)}`
      );
      const vehData = await vehRes.json();
      if (!vehRes.ok) throw new Error(vehData.message || 'Gagal memproses data kendaraan');

      const vId = vehData.data.id;
      setVehicleId(vId);

      // 2. Check-in to create session
      const checkInRes = await authFetch('/api/wac/check-in', {
        method: 'POST',
        body: JSON.stringify({ vehicleId: vId }),
      });
      const checkInData = await checkInRes.json();
      if (!checkInRes.ok) throw new Error(checkInData.message || 'Gagal membuat sesi WAC');

      setSessionId(checkInData.data.id);
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memulai sesi');
    } finally {
      setSubmitting(false);
    }
  };

  // Diagram click handler
  const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setTempCoords({ x, y });
    setModalTitle('');
    setModalDesc('');
    setModalSeverity('minor');
    setIsPinModalOpen(true);
  };

  const handleSavePin = () => {
    if (!tempCoords) return;
    const newPin: DefectPin = {
      id: Date.now().toString(),
      side: currentAngle,
      positionPercentX: Number(tempCoords.x.toFixed(2)),
      positionPercentY: Number(tempCoords.y.toFixed(2)),
      title: modalTitle || 'Temuan Kerusakan Eksterior',
      description: modalDesc || 'Catatan temuan visual pada diagram',
      severity: modalSeverity,
    };
    setPins([...pins, newPin]);
    setIsPinModalOpen(false);
    setTempCoords(null);
  };

  const handleDeletePin = (pinId: string) => {
    setPins(pins.filter((p) => p.id !== pinId));
  };

  // Checklist toggle handler
  const handleToggleCheck = (index: number) => {
    const updated = [...checklist];
    updated[index].isPassed = !updated[index].isPassed;
    setChecklist(updated);
  };

  const handleCheckNote = (index: number, note: string) => {
    const updated = [...checklist];
    updated[index].note = note;
    setChecklist(updated);
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!sessionId) {
      setErrorMessage('ID Sesi tidak ditemukan. Harap ulangi dari langkah pertama.');
      return;
    }
    if (!isSigned) {
      setErrorMessage('Harap tanda tangani laporan inspeksi pada canvas sebelum menyelesaikan.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Submit Pins if any
      if (pins.length > 0) {
        await authFetch('/api/wac/pins', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            pins: pins.map((p) => ({
              id: p.id,
              side: p.side,
              positionPercentX: p.positionPercentX,
              positionPercentY: p.positionPercentY,
              title: p.title,
              description: p.description,
              severity: p.severity,
              photoBase64: null,
            })),
          }),
        });
      }

      // 2. Submit Checklist
      await authFetch('/api/wac/batch-checklist', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          checklist: checklist.map((c) => ({
            itemId: c.itemId,
            itemName: c.itemName,
            category: c.category,
            targetSide: c.targetSide,
            isPassed: c.isPassed,
            note: c.note || (c.isPassed ? 'Kondisi Baik' : 'Perlu Perhatian'),
          })),
        }),
      });

      // 3. Submit Signature (marks session as COMPLETED)
      const sigUrl = `https://wac-digital.local/signatures/session-${sessionId}.png`;
      await authFetch('/api/wac/signature', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          signatureUrl: sigUrl,
          signerName: user?.name || 'Inspector WAC',
          role: user?.role || 'VALET',
        }),
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyimpan hasil inspeksi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Wizard Stepper */}
      <div className="stepper">
        <div 
          className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
          onClick={() => setCurrentStep(1)}
        >
          <div className="step-number">
            {currentStep > 1 ? <i className="fa-solid fa-check"></i> : '1'}
          </div>
          <div className="step-title">1. Data Kendaraan</div>
        </div>

        <div className="step-divider"></div>

        <div 
          className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
          onClick={() => sessionId && setCurrentStep(2)}
        >
          <div className="step-number">
            {currentStep > 2 ? <i className="fa-solid fa-check"></i> : '2'}
          </div>
          <div className="step-title">2. Diagram Eksterior</div>
        </div>

        <div className="step-divider"></div>

        <div 
          className={`step-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}
          onClick={() => sessionId && setCurrentStep(3)}
        >
          <div className="step-number">
            {currentStep > 3 ? <i className="fa-solid fa-check"></i> : '3'}
          </div>
          <div className="step-title">3. Checklist Standar</div>
        </div>

        <div className="step-divider"></div>

        <div 
          className={`step-item ${currentStep === 4 ? 'active' : ''}`}
          onClick={() => sessionId && setCurrentStep(4)}
        >
          <div className="step-number">4</div>
          <div className="step-title">4. Tanda Tangan & Selesai</div>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: '#fca5a5',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: START SESSION & VEHICLE INFO */}
      {currentStep === 1 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.5rem'
            }}>
              <i className="fa-solid fa-truck-ramp-box"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                Langkah 1: Registrasi Sesi & Data Armada
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Lengkapi identitas kendaraan dan driver sebelum memulai inspeksi fisik Walk Around Check.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartSession}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label><i className="fa-solid fa-truck"></i> Nomor Plat Kendaraan</label>
                <input
                  type="text"
                  className="form-input"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Contoh: B 1234 ABC"
                  required
                />
              </div>

              <div className="form-group">
                <label><i className="fa-solid fa-building"></i> Nama Pelanggan / Perusahaan</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="PT Nama Pelanggan"
                  required
                />
              </div>

              <div className="form-group">
                <label><i className="fa-solid fa-car-side"></i> Tipe / Model Armada</label>
                <select
                  className="form-input"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                >
                  <option value="Heavy Duty Truck">Heavy Duty Truck (Tronton / Hino 500)</option>
                  <option value="Trailer Unit 40ft">Trailer Unit 40ft</option>
                  <option value="Box Delivery Van">Box Delivery Van</option>
                  <option value="Pickup Operational">Pickup Operational</option>
                </select>
              </div>

              <div className="form-group">
                <label><i className="fa-solid fa-gauge-high"></i> Odometer Masuk (KM)</label>
                <input
                  type="number"
                  className="form-input"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="form-group">
                <label><i className="fa-solid fa-gas-pump"></i> Level Bahan Bakar (BBM)</label>
                <select
                  className="form-input"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                >
                  <option value="Full">Full (Penuh)</option>
                  <option value="3/4">3/4 Tangki</option>
                  <option value="1/2">1/2 Tangki</option>
                  <option value="1/4">1/4 Tangki</option>
                  <option value="Reserve">Reserve (Kritis)</option>
                </select>
              </div>

              <div className="form-group">
                <label><i className="fa-solid fa-id-badge"></i> Petugas Inspector</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${user?.name || 'Petugas'} (${user?.nik || 'NIK'})`}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Menyiapkan Sesi...
                  </>
                ) : (
                  <>
                    Lanjut ke Diagram Eksterior <i className="fa-solid fa-arrow-right"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: EXTERIOR DIAGRAM & HOTSPOT PIN MARKING */}
      {currentStep === 2 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                Langkah 2: Diagram Eksterior & Hotspot Pin Kerusakan
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Klik pada gambar diagram kendaraan untuk menandai titik kerusakan fisik eksterior.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-warning">
                <i className="fa-solid fa-location-dot"></i> Total Pin: {pins.length}
              </span>
            </div>
          </div>

          {/* Angle Selector Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { key: 'right', label: 'Sisi Kanan (Right)', icon: 'fa-truck' },
              { key: 'front', label: 'Tampak Depan (Front)', icon: 'fa-arrow-up' },
              { key: 'left', label: 'Sisi Kiri (Left)', icon: 'fa-truck fa-flip-horizontal' },
              { key: 'rear', label: 'Tampak Belakang (Rear)', icon: 'fa-arrow-down' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCurrentAngle(tab.key as any)}
                className={`btn ${currentAngle === tab.key ? 'btn-primary' : 'btn-secondary'}`}
              >
                <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
          </div>

          {/* Vehicle Diagram Canvas Viewport */}
          <div className="diagram-viewport" onClick={handleDiagramClick}>
            <div className="diagram-grid"></div>

            <div style={{
              position: 'absolute',
              top: '12px',
              left: '16px',
              background: 'rgba(15, 23, 42, 0.75)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border-color)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              <i className="fa-solid fa-crosshairs"></i> Klik area kendaraan untuk menambah pin temuan
            </div>

            {/* Scalable Vector Graphics for vehicle sides */}
            <svg viewBox="0 0 800 400" width="90%" height="90%" style={{ maxWidth: '750px', maxHeight: '360px' }}>
              {currentAngle === 'right' && (
                <g>
                  {/* Container Cargo Box */}
                  <rect x="60" y="70" width="460" height="210" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
                  <line x1="160" y1="70" x2="160" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  <line x1="260" y1="70" x2="260" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  <line x1="360" y1="70" x2="360" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  <line x1="460" y1="70" x2="460" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  
                  {/* Cabin */}
                  <path d="M 520 130 L 670 130 L 720 190 L 720 280 L 520 280 Z" fill="#334155" stroke="#38bdf8" strokeWidth="3" />
                  {/* Cabin Window */}
                  <polygon points="545,145 650,145 685,190 545,190" fill="#0284c7" opacity="0.35" stroke="#38bdf8" strokeWidth="2" />
                  {/* Door handle */}
                  <rect x="580" y="215" width="22" height="6" rx="2" fill="#94a3b8" />
                  {/* Front Headlight */}
                  <rect x="710" y="235" width="14" height="28" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
                  {/* Rear Indicator */}
                  <rect x="60" y="230" width="8" height="36" rx="2" fill="#ef4444" />
                  {/* Wheels */}
                  <circle cx="150" cy="280" r="44" fill="#0f172a" stroke="#94a3b8" strokeWidth="6" />
                  <circle cx="150" cy="280" r="18" fill="#334155" />
                  <circle cx="260" cy="280" r="44" fill="#0f172a" stroke="#94a3b8" strokeWidth="6" />
                  <circle cx="260" cy="280" r="18" fill="#334155" />
                  <circle cx="630" cy="280" r="44" fill="#0f172a" stroke="#38bdf8" strokeWidth="6" />
                  <circle cx="630" cy="280" r="18" fill="#38bdf8" />
                </g>
              )}

              {currentAngle === 'left' && (
                <g transform="scale(-1, 1) translate(-800, 0)">
                  {/* Inverted truck for left side */}
                  <rect x="60" y="70" width="460" height="210" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
                  <line x1="160" y1="70" x2="160" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  <line x1="260" y1="70" x2="260" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  <line x1="360" y1="70" x2="360" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  <line x1="460" y1="70" x2="460" y2="280" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="2" />
                  
                  <path d="M 520 130 L 670 130 L 720 190 L 720 280 L 520 280 Z" fill="#334155" stroke="#38bdf8" strokeWidth="3" />
                  <polygon points="545,145 650,145 685,190 545,190" fill="#0284c7" opacity="0.35" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="580" y="215" width="22" height="6" rx="2" fill="#94a3b8" />
                  <rect x="710" y="235" width="14" height="28" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
                  <rect x="60" y="230" width="8" height="36" rx="2" fill="#ef4444" />
                  <circle cx="150" cy="280" r="44" fill="#0f172a" stroke="#94a3b8" strokeWidth="6" />
                  <circle cx="150" cy="280" r="18" fill="#334155" />
                  <circle cx="260" cy="280" r="44" fill="#0f172a" stroke="#94a3b8" strokeWidth="6" />
                  <circle cx="260" cy="280" r="18" fill="#334155" />
                  <circle cx="630" cy="280" r="44" fill="#0f172a" stroke="#38bdf8" strokeWidth="6" />
                  <circle cx="630" cy="280" r="18" fill="#38bdf8" />
                </g>
              )}

              {currentAngle === 'front' && (
                <g>
                  {/* Front View */}
                  <rect x="250" y="80" width="300" height="200" rx="16" fill="#334155" stroke="#38bdf8" strokeWidth="3" />
                  {/* Windshield */}
                  <rect x="280" y="100" width="240" height="75" rx="8" fill="#0284c7" opacity="0.35" stroke="#38bdf8" strokeWidth="2" />
                  {/* Mirrors */}
                  <rect x="220" y="120" width="20" height="50" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="560" y="120" width="20" height="50" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  {/* Grille */}
                  <rect x="300" y="195" width="200" height="45" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="320" y1="210" x2="480" y2="210" stroke="#94a3b8" strokeWidth="2" />
                  <line x1="320" y1="225" x2="480" y2="225" stroke="#94a3b8" strokeWidth="2" />
                  {/* Headlights */}
                  <rect x="265" y="200" width="28" height="30" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                  <rect x="507" y="200" width="28" height="30" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                  {/* Front Wheels */}
                  <rect x="240" y="270" width="35" height="50" rx="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="4" />
                  <rect x="525" y="270" width="35" height="50" rx="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="4" />
                  {/* Bumper Plate */}
                  <rect x="350" y="250" width="100" height="24" rx="3" fill="#ffffff" stroke="#000000" strokeWidth="1" />
                  <text x="400" y="267" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000000">{licensePlate}</text>
                </g>
              )}

              {currentAngle === 'rear' && (
                <g>
                  {/* Rear View */}
                  <rect x="240" y="70" width="320" height="210" rx="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
                  {/* Container Doors Divider */}
                  <line x1="400" y1="70" x2="400" y2="280" stroke="#38bdf8" strokeWidth="2" />
                  {/* Door Lock Rods */}
                  <line x1="320" y1="70" x2="320" y2="280" stroke="#94a3b8" strokeWidth="3" />
                  <line x1="480" y1="70" x2="480" y2="280" stroke="#94a3b8" strokeWidth="3" />
                  {/* Tail Lights */}
                  <rect x="250" y="220" width="24" height="45" rx="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                  <rect x="526" y="220" width="24" height="45" rx="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                  {/* Mud flaps & Rear Wheels */}
                  <rect x="235" y="270" width="40" height="50" rx="4" fill="#0f172a" stroke="#94a3b8" strokeWidth="4" />
                  <rect x="525" y="270" width="40" height="50" rx="4" fill="#0f172a" stroke="#94a3b8" strokeWidth="4" />
                  {/* Rear License Plate */}
                  <rect x="350" y="240" width="100" height="24" rx="3" fill="#ffffff" stroke="#000000" strokeWidth="1" />
                  <text x="400" y="257" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000000">{licensePlate}</text>
                </g>
              )}
            </svg>

            {/* Render Pins for Active Angle */}
            {pins
              .filter((p) => p.side === currentAngle)
              .map((pin, idx) => (
                <div
                  key={pin.id}
                  className={`pin-marker ${pin.severity}`}
                  style={{ left: `${pin.positionPercentX}%`, top: `${pin.positionPercentY}%` }}
                  title={`${pin.title}: ${pin.description}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Hapus pin "${pin.title}"?`)) {
                      handleDeletePin(pin.id);
                    }
                  }}
                >
                  {idx + 1}
                </div>
              ))}
          </div>

          {/* Pin Defect List Table */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              Daftar Titik Temuan Kerusakan ({pins.length} Pin)
            </h3>
            {pins.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                <i className="fa-solid fa-circle-info"></i> Belum ada pin temuan pada kendaraan. Silakan klik pada diagram mobil di atas bila terdapat goresan, penyok, atau kerusakan.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Sudut / Sisi</th>
                      <th>Judul Temuan</th>
                      <th>Catatan Detail</th>
                      <th>Tingkat Bahaya</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pins.map((pin, i) => (
                      <tr key={pin.id}>
                        <td>{i + 1}</td>
                        <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{pin.side}</td>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{pin.title}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{pin.description}</td>
                        <td>
                          <span className={`badge ${
                            pin.severity === 'critical' ? 'badge-danger' : pin.severity === 'major' ? 'badge-warning' : 'badge-completed'
                          }`}>
                            {pin.severity}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeletePin(pin.id)}
                            style={{ color: 'var(--accent-rose)', padding: '4px 8px' }}
                            title="Hapus pin"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
              <i className="fa-solid fa-arrow-left"></i> Kembali
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setCurrentStep(3)}>
              Lanjut ke Checklist Standar <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: INSPECTION CHECKLIST */}
      {currentStep === 3 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                Langkah 3: Evaluasi Checklist Komponen Standar
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Periksa kelengkapan dan kondisi fisik komponen operasional kendaraan.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {checklist.map((item, index) => (
              <div
                key={item.itemId}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${item.isPassed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.35)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '260px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    background: item.isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.isPassed ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    fontSize: '1.2rem'
                  }}>
                    <i className={`fa-solid ${item.isPassed ? 'fa-check' : 'fa-xmark'}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {item.itemName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Kategori: <strong style={{ color: 'var(--accent-cyan)' }}>{item.category}</strong> • Posisi: {item.targetSide}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Catatan temuan bila ada..."
                    value={item.note}
                    onChange={(e) => handleCheckNote(index, e.target.value)}
                    style={{ width: '220px', padding: '8px 12px', fontSize: '0.85rem' }}
                  />

                  <button
                    type="button"
                    onClick={() => handleToggleCheck(index)}
                    className={`btn btn-sm ${item.isPassed ? 'btn-success' : 'btn-danger'}`}
                    style={{ minWidth: '100px' }}
                  >
                    {item.isPassed ? (
                      <>
                        <i className="fa-solid fa-circle-check"></i> PASSED
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-triangle-exclamation"></i> FAILED (NG)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
              <i className="fa-solid fa-arrow-left"></i> Kembali
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setCurrentStep(4)}>
              Lanjut ke Tanda Tangan & Selesai <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SIGNATURE & FINAL FINISH */}
      {currentStep === 4 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Langkah 4: Tanda Tangan Digital & Pengesahan Hasil
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Periksa ringkasan audit hasil pemeriksaan WAC dan bubuhkan tanda tangan digital.
            </p>
          </div>

          {/* Audit Summary Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nomor Plat Armada</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {licensePlate}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{vehicleModel}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pelanggan / Driver</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                {customerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Odometer: {odometer} KM • BBM: {fuelLevel}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Temuan Kerusakan</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: pins.length > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)', marginTop: '4px' }}>
                {pins.length > 0 ? `${pins.length} Titik Pin Kerusakan` : 'Nihil Kerusakan (Bersih)'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Checklist: {checklist.filter(c => c.isPassed).length}/{checklist.length} OK
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status Kelayakan Kendaraan</span>
              <div style={{ marginTop: '8px' }}>
                {pins.some(p => p.severity === 'critical') || checklist.some(c => !c.isPassed) ? (
                  <span className="badge badge-warning" style={{ fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> PERLU PERBAIKAN (FOLLOW-UP)
                  </span>
                ) : (
                  <span className="badge badge-completed" style={{ fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-circle-check"></i> LAYAK OPERASIONAL (PASSED)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* HTML5 Canvas Signature Pad */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-pen-nib" style={{ color: 'var(--accent-cyan)' }}></i>
                Tanda Tangan Digital Petugas / Driver
              </label>
              <button
                type="button"
                onClick={clearSignature}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--accent-rose)' }}
              >
                <i className="fa-solid fa-rotate-left"></i> Bersihkan Canvas
              </button>
            </div>

            <div style={{
              background: '#090d16',
              border: '2px dashed rgba(56, 189, 248, 0.4)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              touchAction: 'none'
            }}>
              <canvas
                ref={canvasRef}
                width={700}
                height={200}
                style={{ width: '100%', height: '200px', display: 'block', cursor: 'crosshair' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Gunakan mouse atau jari Anda pada layar sentuh untuk menggambar tanda tangan di atas.
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(3)}>
              <i className="fa-solid fa-arrow-left"></i> Kembali
            </button>
            <button
              type="button"
              className="btn btn-success btn-lg"
              disabled={submitting || !isSigned}
              onClick={handleFinalSubmit}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan Laporan WAC...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check"></i> SIMPAN & SELESAIKAN INSPEKSI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pin Input Modal */}
      {isPinModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPinModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Tambah Detail Kerusakan Eksterior
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Posisi Sudut</label>
                <input
                  type="text"
                  className="form-input"
                  value={`Sisi ${currentAngle.toUpperCase()} (${tempCoords?.x.toFixed(1)}%, ${tempCoords?.y.toFixed(1)}%)`}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div className="form-group">
                <label>Judul Temuan</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Bumper depan penyok / Lampu pecah"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Deskripsi Tambahan</label>
                <textarea
                  className="form-input"
                  placeholder="Catatan detail lokasi, ukuran goresan atau kondisi fisik..."
                  rows={3}
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Tingkat Keparahan (Severity)</label>
                <select
                  className="form-input"
                  value={modalSeverity}
                  onChange={(e) => setModalSeverity(e.target.value as any)}
                >
                  <option value="minor">🟢 Ringan (Minor - Goresan Halus)</option>
                  <option value="major">🟡 Sedang (Major - Penyok / Perlu Cat)</option>
                  <option value="critical">🔴 Berat (Critical - Lampu Pecah / Bahaya Jalan)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPinModalOpen(false)}>
                  Batal
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSavePin}>
                  Simpan Pin Kerusakan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {submitSuccess && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ textAlign: 'center', padding: '36px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'var(--accent-emerald)'
            }}>
              <i className="fa-solid fa-check"></i>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Inspeksi WAC Berhasil Diselesaikan!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '12px 0 24px' }}>
              Semua data armada, titik defect exterior, checklist kelayakan, dan tanda tangan digital telah tersimpan aman di database server.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push('/dashboard')}
              >
                Kembali ke Dashboard
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push('/history')}
              >
                Buka Riwayat & Cetak Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
