import { NextResponse } from 'next/server';
import prisma from '../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../middleware/authMiddleware';

export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      const userId = req.user!.id;

      const notifications = await prisma.notifications.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 20, // Limit to 20 notifications
      });

      // If no notifications exist, let's create a welcome one (for demonstration)
      if (notifications.length === 0) {
        const welcomeNotif = await prisma.notifications.create({
          data: {
            user_id: userId,
            title: 'Welcome to WAC Digital',
            message: 'You can now start inspecting vehicles more efficiently.',
            is_read: false,
          }
        });
        notifications.push(welcomeNotif);
      }

      return NextResponse.json({
        data: notifications
      }, { status: 200 });

    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
