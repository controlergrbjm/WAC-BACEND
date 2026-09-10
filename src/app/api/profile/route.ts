import { NextResponse } from 'next/server';
import prisma from '../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../middleware/authMiddleware';

export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      const userId = req.user!.id;

      // 1. Fetch user data
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
          dealer: true,
        },
      });

      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      // 2. Calculate Stats
      const completedSessions = await prisma.wac_sessions.findMany({
        where: {
          user_id: userId,
          status: 'COMPLETED',
        },
        select: {
          start_time: true,
          end_time: true,
        },
      });

      const wacDone = completedSessions.length;

      let totalDurationHours = 0;
      let countWithEndTime = 0;

      for (const session of completedSessions) {
        if (session.end_time) {
          const diffMs = new Date(session.end_time).getTime() - new Date(session.start_time).getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours >= 0) {
            totalDurationHours += diffHours;
            countWithEndTime++;
          }
        }
      }

      const avgTime = countWithEndTime > 0 ? (totalDurationHours / countWithEndTime).toFixed(1) : 0;
      
      // Mock accuracy for now
      const accuracy = 98;

      return NextResponse.json({
        user: {
          name: user.name,
          role: user.role,
          dealer: user.dealer,
        },
        stats: {
          wacDone,
          avgTime,
          accuracy,
        }
      }, { status: 200 });

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
