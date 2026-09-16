import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../../middleware/authMiddleware';
import * as XLSX from 'xlsx';

export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (authReq) => {
    try {
      const { searchParams } = new URL(authReq.url);
      const year = searchParams.get('year');
      const month = searchParams.get('month');
      const date = searchParams.get('date');
      const status = searchParams.get('status');
      const format = searchParams.get('format') || 'excel'; // 'excel' or 'json'

      const whereClause: any = {};

      // Date filtering
      if (date && date !== 'ALL') {
        const targetDate = new Date(date);
        const start = new Date(targetDate.setHours(0, 0, 0, 0));
        const end = new Date(targetDate.setHours(23, 59, 59, 999));
        whereClause.created_at = { gte: start, lte: end };
      } else if (year && year !== 'ALL') {
        const y = parseInt(year, 10);
        let start: Date;
        let end: Date;

        if (month && month !== 'ALL') {
          const m = parseInt(month, 10) - 1; // 0-indexed
          start = new Date(y, m, 1, 0, 0, 0, 0);
          end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        } else {
          start = new Date(y, 0, 1, 0, 0, 0, 0);
          end = new Date(y, 11, 31, 23, 59, 59, 999);
        }

        whereClause.created_at = { gte: start, lte: end };
      }

      // Status filtering
      if (status && status !== 'ALL') {
        if (status === 'COMPLETED') {
          whereClause.status = { in: ['COMPLETED', 'CHECKED_OUT'] };
        } else {
          whereClause.status = status;
        }
      }

      // Fetch all sessions matching filter
      const sessions = await prisma.wac_sessions.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        include: {
          vehicle: {
            include: { customer: true },
          },
          user: {
            select: { name: true, nik: true, role: true },
          },
          details: {
            include: {
              check_item: {
                include: { category: true },
              },
            },
          },
          photos: true,
          signatures: true,
        },
      });

      // Format clean data rows
      const reportRows = sessions.map((s: any, idx: number) => {
        const defects = s.details?.filter((d: any) => d.status === 'NG') || [];
        const defectNotes = defects.map((d: any) => `${d.check_item?.name || 'Item'}: ${d.note || 'NG'}`).join('; ');
        const photoNotes = s.photos?.map((p: any) => p.part_name).join('; ') || '';
        const allDefectDetails = [defectNotes, photoNotes].filter(Boolean).join(' | ') || 'Nihil Defect (Bersih)';

        const isSigned = (s.signatures?.length || 0) > 0;
        const signerInfo = isSigned
          ? s.signatures.map((sig: any) => `${sig.signer_name} (${sig.role})`).join(', ')
          : 'Belum Ditandatangani';

        // Find BBM and Odometer if stored in checklist notes
        const bbmItem = s.details?.find((d: any) => d.check_item?.category?.name?.includes('BBM') || d.check_item?.name?.includes('BBM'));
        const odomItem = s.details?.find((d: any) => d.check_item?.category?.name?.includes('Odo') || d.check_item?.name?.includes('Odo'));

        return {
          No: idx + 1,
          'ID Sesi': s.id.substring(0, 8),
          'Tanggal & Jam Masuk': new Date(s.start_time || s.created_at).toLocaleString('id-ID'),
          'Waktu Selesai': s.end_time ? new Date(s.end_time).toLocaleString('id-ID') : 'Sedang Berjalan',
          'Nomor Polisi': s.vehicle?.license_plate || '-',
          'Model / Tipe Kendaraan': s.vehicle?.model || '-',
          'Nama Pelanggan': s.vehicle?.customer?.name || 'Walk-In Customer',
          'No. Telepon': s.vehicle?.customer?.phone || '-',
          'Petugas Valet': `${s.user?.name || 'Valet'} (${s.user?.nik || '-'})`,
          'Status WAC': s.status,
          'Odometer (KM)': odomItem?.note || '-',
          'Level BBM': bbmItem?.note || '-',
          'Total Item Diperiksa': s.details?.length || 0,
          'Jumlah Defect (NG)': defects.length + (s.photos?.length || 0),
          'Rincian Temuan Kerusakan': allDefectDetails,
          'Pengesahan Tanda Tangan': signerInfo,
        };
      });

      // If format is json, return JSON payload for UI preview
      if (format === 'json') {
        return NextResponse.json({
          success: true,
          total: reportRows.length,
          data: reportRows,
          summary: {
            totalSessions: reportRows.length,
            completedCount: sessions.filter((s: any) => s.status === 'COMPLETED' || s.status === 'CHECKED_OUT').length,
            inProgressCount: sessions.filter((s: any) => s.status === 'IN_PROGRESS').length,
            checkedOutCount: sessions.filter((s: any) => s.status === 'CHECKED_OUT').length,
          },
        });
      }

      // Generate Excel Workbook
      const workbook = XLSX.utils.book_new();

      // Create sheet with data
      const worksheet = XLSX.utils.json_to_sheet(reportRows);

      // Auto-fit column widths
      const colWidths = [
        { wch: 5 },  // No
        { wch: 12 }, // ID Sesi
        { wch: 22 }, // Tgl Masuk
        { wch: 22 }, // Tgl Selesai
        { wch: 16 }, // Plat
        { wch: 20 }, // Model
        { wch: 26 }, // Pelanggan
        { wch: 16 }, // Telp
        { wch: 22 }, // Petugas
        { wch: 16 }, // Status
        { wch: 14 }, // Odo
        { wch: 12 }, // BBM
        { wch: 18 }, // Total Item
        { wch: 18 }, // Jml Defect
        { wch: 45 }, // Rincian Defect
        { wch: 28 }, // Tanda Tangan
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan WAC Digital');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = `Laporan_WAC_Digital_${year || 'Semua'}_${month ? `Bulan-${month}` : ''}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error: any) {
      console.error('Export report error:', error);
      return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
    }
  });
};
