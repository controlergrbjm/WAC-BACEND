import prisma from '../prisma/db';

// ItemStatus type defined locally to avoid dependency on prisma generate
// After running `npx prisma generate`, you can switch to: import { $Enums } from '@prisma/client';
type ItemStatus = 'OK' | 'NG' | 'WARNING';


export class WacService {
  static async checkIn(vehicleId: string, userId: string) {
    // Prevent starting a new session if one is already in progress for this vehicle
    const existingSession = await prisma.wac_sessions.findFirst({
      where: {
        vehicle_id: vehicleId,
        status: 'IN_PROGRESS'
      }
    });

    if (existingSession) {
      throw new Error('Vehicle already has an inspection in progress');
    }

    const session = await prisma.wac_sessions.create({
      data: {
        vehicle_id: vehicleId,
        user_id: userId,
        status: 'IN_PROGRESS',
      },
    });

    return session;
  }

  static async submitDetail(sessionId: string, checkItemId: string, status: ItemStatus, note?: string, voiceNoteUrl?: string) {
    const detail = await prisma.wac_details.create({
      data: {
        session_id: sessionId,
        check_item_id: checkItemId,
        status: status,
        note: note,
        voice_note_url: voiceNoteUrl
      }
    });

    return detail;
  }

  static async checkOut(sessionId: string, woNumber?: string) {
    const session = await prisma.wac_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        end_time: new Date(),
        is_wo_linked: woNumber ? true : false,
        wo_number: woNumber,
      }
    });

    return session;
  }
}
