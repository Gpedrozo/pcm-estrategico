import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CONFIG_KEY = 'tenant.operational_profile';

export interface ConfiguracoesOperacionaisEmpresa {
  endereco?: string;
  telefone?: string;
  email?: string;
  site?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
  observacoes?: string;
}

export function useConfiguracoesOperacionaisEmpresa() {
  return useQuery({
    queryKey: ['configuracoes_operacionais_empresa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('id,valor')
        .eq('chave', CONFIG_KEY)
        .maybeSingle();

      if (error) throw error;

      let valor: ConfiguracoesOperacionaisEmpresa | null = null;

      if (data?.valor) {
        try {
          valor = JSON.parse(data.valor) as ConfiguracoesOperacionaisEmpresa;
        } catch {
          valor = null;
        }
      }

      return {
        id: data?.id ?? null,
        valor,
      };
    },
  });
}

export function useSalvarConfiguracoesOperacionaisEmpresa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (valor: ConfiguracoesOperacionaisEmpresa) => {
      const payload = {
        chave: CONFIG_KEY,
        categoria: 'tenant',
        tipo: 'json',
        descricao: 'Configurações operacionais editáveis no tenant',
        editavel: true,
        valor: JSON.stringify(valor ?? {}),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .upsert(payload, { onConflict: 'chave' })
        .select('id,valor')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes_operacionais_empresa'] });
    },
  });
}
