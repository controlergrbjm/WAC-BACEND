import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/authMiddleware';
import prisma from '../../../../../prisma/db';
import { z } from 'zod';

const schema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const { sessionId } = schema.parse(body);

      // Verify session belongs to this user
      const session = await prisma.wac_sessions.findFirst({
        where: {
          id: sessionId,
          user_id: (authReq as any).user!.id,
        },
      });

      if (!session) {
        return NextResponse.json({ message: 'Sesi tidak ditemukan' }, { status: 404 });
      }

      // Mark session as COMPLETED
      const updated = await prisma.wac_sessions.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', end_time: new Date() },
      });

      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  });
}
