import prisma from '../prisma/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

export class AuthService {
  static async login(nik: string, password: string) {
    const user = await prisma.users.findUnique({
      where: { nik },
    });

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, nik: user.nik, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: user.id,
        action: 'LOGIN',
        details: 'User logged in successfully',
      },
    });

    return {
      token,
      user: {
        id: user.id,
        nik: user.nik,
        name: user.name,
        role: user.role,
        dealer: user.dealer,
      },
    };
  }
}
