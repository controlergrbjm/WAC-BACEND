import { NextResponse } from 'next/server';
import prisma from '../../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../../middleware/authMiddleware';
import bcrypt from 'bcryptjs';

export const PUT = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      const userId = req.user!.id;
      const body = await req.json();
      const { oldPassword, newPassword } = body;

      if (!oldPassword || !newPassword) {
        return NextResponse.json({ message: 'Old and new passwords are required' }, { status: 400 });
      }

      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ message: 'Incorrect old password' }, { status: 400 });
      }

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await prisma.users.update({
        where: { id: userId },
        data: { password: hashedNew },
      });

      return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
    } catch (error: any) {
      console.error('Error updating password:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
