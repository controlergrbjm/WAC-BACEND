import { NextRequest, NextResponse } from 'next/server';
import { VehicleService } from '../services/vehicleService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class VehicleController {
  static async getVehicle(req: AuthenticatedRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const licensePlate = searchParams.get('licensePlate');

      if (!licensePlate) {
        return NextResponse.json({
          success: false,
          message: 'License plate is required'
        }, { status: 400 });
      }

      const vehicle = await VehicleService.getVehicleByPlate(licensePlate);

      return NextResponse.json({
        success: true,
        data: vehicle
      }, { status: 200 });

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: error.message === 'Vehicle not found' ? 404 : 500 });
    }
  }

  static async getVehicles(req: AuthenticatedRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const skip = parseInt(searchParams.get('skip') || '0');
      const take = parseInt(searchParams.get('take') || '20');

      const vehicles = await VehicleService.getAllVehicles(skip, take);

      return NextResponse.json({
        success: true,
        data: vehicles
      }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        message: 'Internal server error'
      }, { status: 500 });
    }
  }
}
