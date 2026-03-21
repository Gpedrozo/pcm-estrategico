import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

export interface DadosEmpresa {
  id: string;
  empresa_id?: string | null;
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
  logo_url: string | null;
  logo_os_url: string | null;
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
      const tenantId = tenant?.id;
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('dados_empresa')
        .select('*')
        .eq('empresa_id', tenantId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return data as unknown as DadosEmpresa;
      }

      // Bootstrap tenant company profile from owner-side base company record when missing.
      const { data: empresaBase, error: empresaError } = await supabase
        .from('empresas')
        .select('id,nome,cnpj')
        .eq('id', tenantId)
        .maybeSingle();

      if (empresaError) throw empresaError;
      if (!empresaBase) return null;

      const payload = {
        empresa_id: tenantId,
        razao_social: empresaBase.nome,
        nome_fantasia: empresaBase.nome,
        cnpj: empresaBase.cnpj,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('dados_empresa')
        .upsert(payload, { onConflict: 'empresa_id' })
        .select('*')
        .maybeSingle();

      if (insertError) throw insertError;
      return (inserted as unknown as DadosEmpresa) ?? null;
    },
    enabled: Boolean(tenant?.id),
  });
}

export function useUpdateDadosEmpresa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isSystemOwner } = useAuth();

  return useMutation({
    mutationFn: async (payload: Partial<DadosEmpresa> & { id: string }) => {
      if (!isSystemOwner) {
        throw new Error('Edição de dados legais da empresa permitida somente no portal OWNER.');
      }

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
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar dados da empresa.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
