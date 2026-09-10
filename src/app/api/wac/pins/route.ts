import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/authMiddleware';
import prisma from '../../../../../prisma/db';
import { z } from 'zod';

const schema = z.object({
  sessionId: z.string().uuid(),
  pins: z.array(z.object({
    id: z.string(),
    side: z.string(),
    positionPercentX: z.number(),
    positionPercentY: z.number(),
    title: z.string(),
    description: z.string(),
    severity: z.string(),
    photoBase64: z.string().nullable().optional(),
  })),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const body = await authReq.json();
    const { sessionId, pins } = schema.parse(body);

    const results = await Promise.all(
      pins.map(async (pin) => {
        // We will store pins as wac_photos since it fits nicely with the defect and photo logic.
        // In the future, a dedicated wac_defect_pins table might be better, but we reuse wac_photos for now.
        return prisma.wac_photos.create({
          data: {
            session_id: sessionId,
            photo_url: pin.photoBase64 ? `data:image/jpeg;base64,${pin.photoBase64}` : 'no-image',
            part_name: `[${pin.severity}] ${pin.side} - ${pin.title}: ${pin.description}`,
            is_exterior: true,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: `${results.length} pins saved.`,
      data: results,
    }, { status: 201 });
  });
}
