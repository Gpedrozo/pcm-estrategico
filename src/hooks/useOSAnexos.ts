import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToStorage } from '@/services/storage';
import { writeAuditLog } from '@/lib/audit';

export interface OSAnexo {
  id: string;
  empresa_id: string;
  os_id: string;
  url: string;
  nome: string;
  tipo: string;
  tamanho_bytes: number | null;
  created_at: string;
}

export function useOSAnexos(osId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['os-anexos', tenantId, osId],
    queryFn: async () => {
      if (!osId || !tenantId) return [];
      const { data, error } = await supabase
        .from('os_anexos')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('os_id', osId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OSAnexo[];
    },
    enabled: !!osId && !!tenantId,
  });
}

export function useUploadOSAnexo() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ osId, file }: { osId: string; file: File }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const ext = file.name.split('.').pop() || 'bin';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `os-anexos/${tenantId}/${osId}/${Date.now()}_${safeName}`;

      const url = await uploadToStorage('attachments', path, file);

      const { data, error } = await supabase
        .from('os_anexos')
        .insert({
          empresa_id: tenantId,
          os_id: osId,
          url,
          nome: file.name,
          tipo: ext,
          tamanho_bytes: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OSAnexo;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['os-anexos', tenantId, vars.osId] });
      writeAuditLog({ action: 'UPLOAD_OS_ANEXO', table: 'os_anexos', recordId: _data.id, empresaId: tenantId, source: 'useOSAnexos' });
    },
  });
}
