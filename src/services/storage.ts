import { supabase } from '@/integrations/supabase/client';

const ALLOWED_BUCKETS = new Set(['public', 'support-attachments', 'logos', 'documentos', 'avatars']);

export async function uploadToStorage(bucket: string, filePath: string, file: File) {
  if (!ALLOWED_BUCKETS.has(bucket)) throw new Error('Bucket não permitido');
  if (filePath.includes('..') || filePath.startsWith('/')) throw new Error('Caminho inválido');

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
