import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/authMiddleware';
import { AuthenticatedRequest } from '../../../../../middleware/authMiddleware';
import prisma from '../../../../../prisma/db';

// GET /api/wac/vehicles?plate=xxx&customerName=xxx&vehicleType=xxx
// Cari atau buat kendaraan berdasarkan plat nomor
async function handler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plate = searchParams.get('plate');
    const customerName = searchParams.get('customerName') || 'Walk-In Customer';
    const vehicleType = searchParams.get('vehicleType');

    if (!plate) {
      return NextResponse.json({ message: 'plate parameter is required' }, { status: 400 });
    }

    // Cari kendaraan berdasarkan plat
    let vehicle = await prisma.vehicles.findUnique({
      where: { license_plate: plate.toUpperCase() },
      include: { customer: true },
    });

    if (!vehicle) {
      // Buat customer baru dengan nama yang diinput
      const customer = await prisma.customers.create({
        data: { name: customerName },
      });

      vehicle = await prisma.vehicles.create({
        data: {
          license_plate: plate.toUpperCase(),
          model: vehicleType || 'Unknown',
          customer_id: customer.id,
        },
        include: { customer: true },
      });
    } else {
      // Update nama customer dan model jika ada perubahan
      await prisma.customers.update({
        where: { id: vehicle.customer_id },
        data: { name: customerName },
      });
      if (vehicleType && vehicleType !== 'Unknown') {
        await prisma.vehicles.update({
          where: { id: vehicle.id },
          data: { model: vehicleType },
        });
      }
      // Refresh
      vehicle = await prisma.vehicles.findUnique({
        where: { id: vehicle.id },
        include: { customer: true },
      }) as any;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: vehicle!.id,
        licensePlate: vehicle!.license_plate,
        model: vehicle!.model,
        customer: (vehicle as any).customer?.name ?? '',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return withAuth(req, handler);
}
