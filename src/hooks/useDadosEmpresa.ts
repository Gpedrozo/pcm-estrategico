import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export interface DadosEmpresa {
  id: string;
  tenant_id?: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  responsavel_nome: string | null;
  responsavel_cargo: string | null;
  logo_principal_url: string | null;
  logo_login_url: string | null;
  logo_menu_url: string | null;
  logo_os_url: string | null;
  logo_pdf_url: string | null;
  logo_relatorio_url: string | null;
  created_at: string;
  updated_at: string;
}

// Alias for backward compatibility
export type Empresa = DadosEmpresa;

export function useDadosEmpresa() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['dados-empresa', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dados_empresa')
        .select('*')
        .eq('tenant_id', tenant?.id || '')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DadosEmpresa | null;
    },
    enabled: Boolean(tenant?.id),
  });
}

export function useUpdateDadosEmpresa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<DadosEmpresa> & { id: string }) => {
      const { id, ...updates } = payload;
      const { data, error } = await supabase
        .from('dados_empresa')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      toast({
        title: 'Sucesso!',
        description: 'Dados da empresa atualizados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEmpresa() {
  return useUpdateDadosEmpresa();
}

export async function uploadLogo(file: File, path?: string) {
  const filePath = path || `logos/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('empresa-logos')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('empresa-logos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
