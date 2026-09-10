import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key'; // Can be Service Role Key if strict bypass is needed

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export class SupabaseStorageService {
  static async uploadPhoto(fileBuffer: Buffer, fileName: string, bucket: string = 'inspection-photo') {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    return publicUrl;
  }

  static async uploadSignature(fileBuffer: Buffer, fileName: string) {
    return this.uploadPhoto(fileBuffer, fileName, 'signature');
  }

  static async uploadDocument(fileBuffer: Buffer, fileName: string) {
    return this.uploadPhoto(fileBuffer, fileName, 'documents');
  }
}
