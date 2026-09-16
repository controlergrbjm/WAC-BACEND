import { NextResponse } from 'next/server';
import prisma from '../../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../../middleware/authMiddleware';

export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      // Mendapatkan tanggal hari ini (mulai dari jam 00:00:00 sampai 23:59:59)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Hitung statistik SEMUA sesi WAC hari ini (tidak difilter per user)
      const sessionsToday = await prisma.wac_sessions.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const totalVehicles = sessionsToday.length;
      const inspection = sessionsToday.filter((s: any) => s.status === 'IN_PROGRESS').length;
      // CHECKED_OUT juga dihitung sebagai completed (sudah Unit Out)
      const completed = sessionsToday.filter((s: any) => s.status === 'COMPLETED' || s.status === 'CHECKED_OUT').length;
      const waiting = Math.max(0, totalVehicles - inspection - completed);

      // Ambil SEMUA inspeksi aktif yang sedang berjalan (IN_PROGRESS) oleh tim Valet
      const activeSessions = await prisma.wac_sessions.findMany({
        where: {
          status: 'IN_PROGRESS',
        },
        orderBy: {
          start_time: 'desc',
        },
        include: {
          vehicle: {
            include: { customer: true },
          },
          details: true,
          user: {
            select: { name: true, nik: true },
          },
        },
      });

      const activeInspections = activeSessions.map((session: any) => {
        const totalItemsAssumed = 40;
        const progressRaw = session.details.length / totalItemsAssumed;
        const progress = Math.min(100, Math.round(progressRaw * 100));

        return {
          sessionId: session.id,
          licensePlate: session.vehicle.license_plate,
          vehicleModel: session.vehicle.model,
          customerName: session.vehicle.customer?.name || 'Walk-In Customer',
          progress: progress,
          inspectorName: session.user?.name ?? 'Valet',
          inspectorNik: session.user?.nik ?? '',
          startTime: session.start_time,
          detailsCount: session.details.length,
        };
      });

      return NextResponse.json({
        totalVehicles,
        waiting,
        inspection,
        completed,
        activeInspection: activeInspections.length > 0 ? activeInspections[0] : null,
        activeInspections,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
