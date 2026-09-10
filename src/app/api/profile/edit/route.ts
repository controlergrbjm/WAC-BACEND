import { NextResponse } from 'next/server';
import prisma from '../../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../../middleware/authMiddleware';

export const PUT = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      const userId = req.user!.id;
      const body = await req.json();
      const { name, dealer } = body;

      if (!name) {
        return NextResponse.json({ message: 'Name is required' }, { status: 400 });
      }

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: {
          name,
          dealer: dealer || null,
        },
        select: { id: true, name: true, role: true, dealer: true },
      });

      return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser }, { status: 200 });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
