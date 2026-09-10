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

      // Ambil inspeksi aktif terbaru dari SEMUA user (jika ada)
      const latestActiveSession = await prisma.wac_sessions.findFirst({
        where: {
          status: 'IN_PROGRESS',
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        include: {
          vehicle: true,
          details: true,
          user: {
            select: { name: true },
          },
        },
      });

      let activeInspection = null;
      if (latestActiveSession) {
        const totalItemsAssumed = 40;
        const progressRaw = latestActiveSession.details.length / totalItemsAssumed;
        const progress = Math.min(100, Math.round(progressRaw * 100));

        activeInspection = {
          sessionId: latestActiveSession.id,
          licensePlate: latestActiveSession.vehicle.license_plate,
          vehicleModel: latestActiveSession.vehicle.model,
          progress: progress,
          inspectorName: latestActiveSession.user?.name ?? 'Unknown',
        };
      }

      return NextResponse.json({
        totalVehicles,
        waiting,
        inspection,
        completed,
        activeInspection,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
