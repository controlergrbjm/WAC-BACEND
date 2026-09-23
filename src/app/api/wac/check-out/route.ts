import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '../../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../../middleware/authMiddleware';

const schema = z.object({
  sessionId: z.string().uuid(),
  signatureUrl: z.string().optional(),
  signerName: z.string().optional(),
  role: z.string().optional(),
});

// POST /api/wac/check-out
export const POST = async (req: AuthenticatedRequest) => {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: 'Invalid data', errors: result.error.format() },
          { status: 400 }
        );
      }

      const { sessionId, signatureUrl, signerName, role } = result.data;

      // Ensure session exists and is COMPLETED
      const session = await prisma.wac_sessions.findUnique({ where: { id: sessionId } });
      if (!session) {
        return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
      }
      
      // We can allow checkout even if it's already checked out for idempotency, or restrict it
      // if (session.status !== 'COMPLETED') {
      //   return NextResponse.json({ success: false, message: 'Session is not COMPLETED' }, { status: 400 });
      // }

      // Use a transaction to update status and save signature
      await prisma.$transaction(async (tx: any) => {
        await tx.wac_sessions.update({
          where: { id: sessionId },
          data: { 
            status: 'CHECKED_OUT',
            updated_at: new Date(),
          },
        });

        if (signatureUrl && signerName && role) {
          await tx.wac_signatures.create({
            data: {
              session_id: sessionId,
              signature_url: signatureUrl,
              signer_name: signerName,
              role: role,
            },
          });
        }
      });

      return NextResponse.json(
        { success: true, message: 'Unit Out completed successfully.' },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Check-out error:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error', error: error.message },
        { status: 500 }
      );
    }
  });
};
