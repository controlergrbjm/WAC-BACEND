import { NextResponse } from 'next/server';
import prisma from '../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../middleware/authMiddleware';

export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      const userId = req.user!.id;

      // 1. Fetch all wac_sessions for this user
      const sessions = await prisma.wac_sessions.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        include: {
          vehicle: {
            include: { customer: true }
          },
          user: {
            select: { name: true, role: true }
          },
          details: true,
          photos: true,
          signatures: true,
        },
      });

      // 2. Format data for history
      const formattedHistory = sessions.map((session: any) => {
        const defectsCount = session.details?.filter((d: any) => d.status === 'NG').length || 0;
        const photosCount = session.photos?.length || 0;
        const isSigned = session.signatures?.length > 0;

        return {
          id: session.id,
          status: session.status,
          date: session.created_at, // ISO string
          vehicle: {
            licensePlate: session.vehicle.license_plate,
            model: session.vehicle.model,
            customerName: session.vehicle.customer?.name || 'Unknown Customer',
          },
          inspector: {
            name: session.user.name,
            role: session.user.role,
          },
          stats: {
            defectsCount,
            photosCount,
            isSigned,
          },
          details: session.details?.map((d: any) => ({
            checkItemId: d.check_item_id,
            status: d.status,
            note: d.note,
          })) || [],
          photos: session.photos?.map((p: any) => ({
            id: p.id,
            photoUrl: p.photo_url,
            partName: p.part_name,
            isExterior: p.is_exterior,
          })) || [],
          signatures: session.signatures?.map((s: any) => ({
            signerName: s.signer_name,
            role: s.role,
            signatureUrl: s.signature_url,
            verifiedAt: s.verified_at,
          })) || [],
        };
      });

      return NextResponse.json({
        data: formattedHistory
      }, { status: 200 });

    } catch (error: any) {
      console.error('Error fetching history:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
