import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    nik: string;
    role: string;
  };
}

export async function withAuth(
  req: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  allowedRoles?: string[]
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized, token missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden, insufficient role' }, { status: 403 });
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = decoded;
  } catch (error) {
    return NextResponse.json({ message: 'Unauthorized, invalid token' }, { status: 401 });
  }

  // Execute handler outside the catch block so errors inside handler are not masked as token errors
  return await handler(req as AuthenticatedRequest);
}
