import prisma from '../prisma/db';

export class VehicleService {
  static async getVehicleByPlate(licensePlate: string) {
    const vehicle = await prisma.vehicles.findUnique({
      where: { license_plate: licensePlate },
      include: {
        customer: true,
      },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  }

  static async getAllVehicles(skip: number = 0, take: number = 20) {
    return await prisma.vehicles.findMany({
      skip,
      take,
      include: {
        customer: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
