import { NextResponse } from 'next/server';
import prisma from '../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../middleware/authMiddleware';

export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async (req) => {
    try {
      const userId = req.user!.id;

      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
      const search = (searchParams.get('search') || '').trim();
      const statusFilter = (searchParams.get('status') || '').trim();
      const myOnly = searchParams.get('myOnly') === 'true';

      const whereClause: any = {};
      if (myOnly) {
        whereClause.user_id = userId;
      }

      if (statusFilter && statusFilter.toUpperCase() !== 'ALL') {
        if (statusFilter.toUpperCase() === 'COMPLETED') {
          whereClause.status = { in: ['COMPLETED', 'CHECKED_OUT'] };
        } else if (statusFilter.toUpperCase() === 'IN PROGRESS' || statusFilter.toUpperCase() === 'IN_PROGRESS') {
          whereClause.status = 'IN_PROGRESS';
        } else if (statusFilter.toUpperCase() === 'FOLLOW UP' || statusFilter.toUpperCase() === 'NEED_FOLLOW_UP') {
          whereClause.status = 'NEED_FOLLOW_UP';
        } else {
          whereClause.status = statusFilter;
        }
      }

      if (search.length > 0) {
        whereClause.OR = [
          { vehicle: { license_plate: { contains: search, mode: 'insensitive' } } },
          { vehicle: { model: { contains: search, mode: 'insensitive' } } },
          { vehicle: { customer: { name: { contains: search, mode: 'insensitive' } } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const total = await prisma.wac_sessions.count({ where: whereClause });
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const skip = (page - 1) * limit;

      // 1. Fetch wac_sessions with pagination
      const sessions = await prisma.wac_sessions.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
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
        success: true,
        data: formattedHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }, { status: 200 });

    } catch (error: any) {
      console.error('Error fetching history:', error);
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
  });
};
