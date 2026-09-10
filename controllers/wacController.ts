import { NextRequest, NextResponse } from 'next/server';
import { WacService } from '../services/wacService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { z } from 'zod';

const checkInSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
});

const submitDetailSchema = z.object({
  sessionId: z.string().uuid(),
  checkItemId: z.string().uuid(),
  status: z.enum(['OK', 'NG', 'WARNING']),
  note: z.string().optional(),
  voiceNoteUrl: z.string().optional(),
});

export class WacController {
  static async checkIn(req: AuthenticatedRequest) {
    try {
      const body = await req.json();
      const validatedData = checkInSchema.parse(body);
      const userId = req.user!.id; // Authenticated from middleware

      const session = await WacService.checkIn(validatedData.vehicleId, userId);

      return NextResponse.json({
        success: true,
        message: 'Check in successful',
        data: session,
      }, { status: 201 });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  static async submitDetail(req: AuthenticatedRequest) {
    try {
      const body = await req.json();
      const validatedData = submitDetailSchema.parse(body);

      const detail = await WacService.submitDetail(
        validatedData.sessionId,
        validatedData.checkItemId,
        validatedData.status,
        validatedData.note,
        validatedData.voiceNoteUrl
      );

      return NextResponse.json({
        success: true,
        message: 'Detail submitted',
        data: detail,
      }, { status: 201 });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
