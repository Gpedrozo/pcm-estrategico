import { supabase } from '@/integrations/supabase/client';

export async function uploadToStorage(bucket: string, filePath: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
