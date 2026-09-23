import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/authMiddleware';
import prisma from '../../../../../prisma/db';
import { z } from 'zod';

const schema = z.object({
  sessionId: z.string().uuid(),
  signatureUrl: z.string().min(1),
  signerName: z.string().min(1),
  role: z.string().min(1),
  isComplete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const body = await authReq.json();
    const data = schema.parse(body);

    const sig = await prisma.wac_signatures.create({
      data: {
        session_id: data.sessionId,
        signature_url: data.signatureUrl,
        signer_name: data.signerName,
        role: data.role,
      },
    });

    // Mark session as completed ONLY IF signed by CUSTOMER or explicitly requested
    const isCustomer = data.role.trim().toUpperCase() === 'CUSTOMER';
    if (isCustomer || data.isComplete === true) {
      await prisma.wac_sessions.update({
        where: { id: data.sessionId },
        data: { status: 'COMPLETED', end_time: new Date() },
      });
    }

    return NextResponse.json({ success: true, data: sig }, { status: 201 });
  });
}
