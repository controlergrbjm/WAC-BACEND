import { NextResponse } from 'next/server';
import prisma from '../../../../../prisma/db';
import { withAuth, AuthenticatedRequest } from '../../../../../middleware/authMiddleware';

// GET /api/sa/valet-results
// Returns all COMPLETED/CHECKED_OUT sessions for SA view with full vehicle detail
export const GET = async (req: AuthenticatedRequest) => {
  return withAuth(req, async () => {
    try {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
      const search = (searchParams.get('search') || '').trim();

      const whereClause: any = {
        status: { in: ['COMPLETED', 'CHECKED_OUT'] },
      };

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

      const sessions = await prisma.wac_sessions.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          vehicle: {
            include: { customer: true },
          },
          user: {
            select: { name: true, role: true, nik: true },
          },
          details: {
            include: {
              check_item: {
                include: { category: true },
              },
            },
          },
          photos: true,
          signatures: true,
        },
      });

      const formatted = sessions.map((session: any) => {
        const okCount = session.details?.filter((d: any) => d.status === 'OK').length ?? 0;
        const ngCount = session.details?.filter((d: any) => d.status === 'NG').length ?? 0;

        // Parse BBM and odometer from the notes on checklist items
        const bbmItem = session.details?.find((d: any) =>
          d.check_item?.name?.toLowerCase().includes('bbm') || d.check_item?.name?.toLowerCase().includes('bahan bakar')
        );
        const odomItem = session.details?.find((d: any) =>
          d.check_item?.name?.toLowerCase().includes('odometer') || d.check_item?.name?.toLowerCase().includes('km saat')
        );

        return {
          id: session.id,
          status: session.status,
          woNumber: session.wo_number,
          startTime: session.start_time,
          endTime: session.end_time,
          createdAt: session.created_at,
          vehicle: {
            licensePlate: session.vehicle?.license_plate ?? '',
            model: session.vehicle?.model ?? '',
            color: session.vehicle?.color ?? '',
            customerName: session.vehicle?.customer?.name ?? 'Unknown Customer',
            customerPhone: session.vehicle?.customer?.phone ?? '',
          },
          inspector: {
            name: session.user?.name ?? '',
            role: session.user?.role ?? '',
            nik: session.user?.nik ?? '',
          },
          stats: {
            okCount,
            ngCount,
            photosCount: session.photos?.length ?? 0,
            isSigned: (session.signatures?.length ?? 0) > 0,
          },
          // Checklist grouped by category for SA view
          checklist: session.details?.map((d: any) => ({
            itemName: d.check_item?.name ?? '',
            category: d.check_item?.category?.name ?? '',
            targetSide: d.check_item?.description ?? '',
            status: d.status,
            note: d.note ?? '',
          })) ?? [],
          photos: session.photos?.map((p: any) => ({
            id: p.id,
            photoUrl: p.photo_url,
            partName: p.part_name,
            isExterior: p.is_exterior,
          })) ?? [],
          signatures: session.signatures?.map((s: any) => ({
            signerName: s.signer_name,
            role: s.role,
            signatureUrl: s.signature_url,
            verifiedAt: s.verified_at,
          })) ?? [],
          // Convenience fields for quick display
          bbmNote: bbmItem?.note ?? '-',
          odometerNote: odomItem?.note ?? '-',
        };
      });

      return NextResponse.json({
        success: true,
        data: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }, { status: 200 });
    } catch (error: any) {
      console.error('SA valet results error:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error', error: error.message },
        { status: 500 }
      );
    }
  });
};
