import { NextRequest } from 'next/server';
import { WacController } from '../../../../../controllers/wacController';
import { withAuth } from '../../../../../middleware/authMiddleware';

export async function POST(req: NextRequest) {
  return withAuth(req, WacController.checkIn);
}
