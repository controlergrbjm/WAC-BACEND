import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/authService';
import { z } from 'zod';

const loginSchema = z.object({
  nik: z.string().min(1, 'NIK is required'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async login(req: NextRequest) {
    try {
      const body = await req.json();
      
      // Validation
      const validatedData = loginSchema.parse(body);

      const result = await AuthService.login(validatedData.nik, validatedData.password);

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        data: result,
      }, { status: 200 });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        message: error.message || 'Internal server error',
      }, { status: error.message === 'Invalid credentials' || error.message === 'User not found or inactive' ? 401 : 500 });
    }
  }
}
