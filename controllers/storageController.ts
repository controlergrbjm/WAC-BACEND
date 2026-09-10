import { NextRequest, NextResponse } from 'next/server';
import { SupabaseStorageService } from '../services/supabaseStorageService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class StorageController {
  static async uploadPhoto(req: AuthenticatedRequest) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const type = formData.get('type') as string || 'photo'; // photo, signature, document
      
      if (!file) {
        return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${req.user?.id}_${Date.now()}_${file.name}`;
      
      let url = '';
      if (type === 'signature') {
        url = await SupabaseStorageService.uploadSignature(buffer, fileName);
      } else if (type === 'document') {
        url = await SupabaseStorageService.uploadDocument(buffer, fileName);
      } else {
        url = await SupabaseStorageService.uploadPhoto(buffer, fileName);
      }

      return NextResponse.json({
        success: true,
        message: 'Upload successful',
        data: { url },
      }, { status: 201 });

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        message: error.message || 'Internal server error',
      }, { status: 500 });
    }
  }
}
