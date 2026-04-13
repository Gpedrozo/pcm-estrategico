import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

export interface DadosEmpresa {
  /** empresa_id is the PK in production; `id` kept as alias for legacy compat */
  id: string;
  empresa_id: string;
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
  logo_url: string | null;
  logo_os_url: string | null;
  /** Per-context logo columns managed by MasterLogoManager */
  logo_principal_url: string | null;
  logo_menu_url: string | null;
  logo_login_url: string | null;
  logo_pdf_url: string | null;
  logo_relatorio_url: string | null;
  created_at: string;
  updated_at: string;
}

// Alias for backward compatibility
export type Empresa = DadosEmpresa;

export function useDadosEmpresa() {
  const { tenant } = useTenant();
  const { tenantId: authTenantId } = useAuth();

  // For MASTER_TI/SYSTEM_OWNER users on the base domain (e.g. gppis.com.br/master-ti),
  // TenantContext resolves to null because hostname-based slug resolution returns 'default'.
  // AuthContext.tenantId reads from profiles/user_roles and is always correct regardless
  // of the hostname, so use it as fallback to prevent the "Cadastro pendente" false state.
  const effectiveTenantId = tenant?.id ?? authTenantId ?? null;

  return useQuery({
    queryKey: ['dados-empresa', effectiveTenantId],
    queryFn: async () => {
      const tenantId = effectiveTenantId;
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('dados_empresa')
        .select('*')
        .eq('empresa_id', tenantId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Fetch logo URLs stored in configuracoes_sistema (fallback for legacy tenants)
      const { data: logosConfig } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', 'tenant.logos')
        .maybeSingle();

      const logos = (logosConfig?.valor ?? {}) as Record<string, string | null>;

      if (data) {
        const row = data as Record<string, unknown>;
        const empresaId = (row.empresa_id ?? row.id ?? tenantId) as string;
        const logoUrlLegacy = (row.logo_url as string | null) ?? logos.logo_url ?? null;
        const logoOsLegacy  = (row.logo_os_url as string | null) ?? logos.logo_os_url ?? null;
        return {
          ...row,
          id: empresaId,
          empresa_id: empresaId,
          logo_url: logoUrlLegacy,
          logo_os_url: logoOsLegacy,
          logo_principal_url: (row.logo_principal_url as string | null) ?? logoUrlLegacy,
          logo_menu_url:      (row.logo_menu_url      as string | null) ?? logoUrlLegacy,
          logo_login_url:     (row.logo_login_url     as string | null) ?? logoUrlLegacy,
          logo_pdf_url:       (row.logo_pdf_url       as string | null) ?? logoOsLegacy ?? logoUrlLegacy,
          logo_relatorio_url: (row.logo_relatorio_url as string | null) ?? logoOsLegacy ?? logoUrlLegacy,
        } as unknown as DadosEmpresa;
      }

      // Bootstrap tenant company profile from owner-side base company record when missing.
      const { data: empresaBase, error: empresaError } = await supabase
        .from('empresas')
        .select('id,nome')
        .eq('id', tenantId)
        .maybeSingle();

      if (empresaError) throw empresaError;
      if (!empresaBase) return null;

      const payload = {
        empresa_id: tenantId,
        razao_social: empresaBase.nome,
        nome_fantasia: empresaBase.nome,
        cnpj: null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('dados_empresa')
        .upsert(payload, { onConflict: 'empresa_id' })
        .select('*')
        .maybeSingle();

      if (insertError) throw insertError;

      if (inserted) {
        const row = inserted as Record<string, unknown>;
        const empresaId = (row.empresa_id ?? row.id ?? tenantId) as string;
        const logoUrlLegacy = (row.logo_url as string | null) ?? logos.logo_url ?? null;
        const logoOsLegacy  = (row.logo_os_url as string | null) ?? logos.logo_os_url ?? null;
        return {
          ...row,
          id: empresaId,
          empresa_id: empresaId,
          logo_url: logoUrlLegacy,
          logo_os_url: logoOsLegacy,
          logo_principal_url: (row.logo_principal_url as string | null) ?? logoUrlLegacy,
          logo_menu_url:      (row.logo_menu_url      as string | null) ?? logoUrlLegacy,
          logo_login_url:     (row.logo_login_url     as string | null) ?? logoUrlLegacy,
          logo_pdf_url:       (row.logo_pdf_url       as string | null) ?? logoOsLegacy ?? logoUrlLegacy,
          logo_relatorio_url: (row.logo_relatorio_url as string | null) ?? logoOsLegacy ?? logoUrlLegacy,
        } as unknown as DadosEmpresa;
      }

      return null;
    },
    enabled: Boolean(effectiveTenantId),
  });
}

export function useUpdateDadosEmpresa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isSystemOwner, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (payload: Partial<DadosEmpresa> & { id: string }) => {
      if (!isSystemOwner) {
        throw new Error('Edição de dados legais da empresa permitida somente no portal OWNER.');
      }

      const { id, empresa_id, ...updates } = payload;
      const eqId = empresa_id ?? id;
      const { data, error } = await supabase
        .from('dados_empresa')
        .update(updates)
        .eq('empresa_id', eqId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      toast({
        title: 'Sucesso!',
        description: 'Dados da empresa atualizados.',
      });
      writeAuditLog({ action: 'UPDATE_DADOS_EMPRESA', table: 'dados_empresa', recordId: data?.empresa_id ?? data?.id, empresaId: tenantId, source: 'useDadosEmpresa', severity: 'info' });
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
