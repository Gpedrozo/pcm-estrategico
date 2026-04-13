import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { writeAuditLog } from '@/lib/audit';

export interface AuditoriaRow {
  id: string;
  usuario_id: string | null;
  usuario_nome: string;
  acao: string;
  descricao: string;
  tag: string | null;
  data_hora: string;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  diferenca: Record<string, unknown> | null;
  resultado: string;
  registro_id: string | null;
  ip_address: string | null;
  mensagem_erro: string | null;
}

export interface AuditoriaInsert {
  usuario_nome: string;
  acao: string;
  descricao: string;
  tag?: string | null;
  usuario_id?: string | null;
}

export interface AuditoriaFilters {
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditoria(filters?: AuditoriaFilters) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['auditoria', tenantId, filters?.limit ?? null, filters?.offset ?? null, filters?.dateFrom ?? null, filters?.dateTo ?? null],
    queryFn: async () => {
      let query = supabase
        .from('enterprise_audit_logs')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (typeof filters?.offset === 'number') {
        const from = Math.max(0, filters.offset);
        const to = from + Math.max(1, filters.limit ?? 200) - 1;
        query = query.range(from, to);
      } else {
        query = query.limit(filters?.limit ?? 500);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => {
        const acao = (row.acao ?? row.action ?? 'UPDATE').toUpperCase() as string;
        const tabela = (row.tabela ?? row.table_name ?? '') as string;
        const registroId = (row.registro_id ?? row.record_id ?? null) as string | null;
        const idSuffix = registroId ? ` #${registroId.slice(0, 8)}` : '';
        const dadosDepois = row.dados_depois as Record<string, unknown> | null;
        const dadosAntes = row.dados_antes as Record<string, unknown> | null;
        const diferenca = row.diferenca as Record<string, unknown> | null;

        let descricao: string;
        if (diferenca && Object.keys(diferenca).length > 0) {
          const campos = Object.keys(diferenca).filter(c => !c.startsWith('_')).slice(0, 3).join(', ');
          descricao = campos ? `Alterou ${tabela}${idSuffix}: ${campos}` : `Alterou ${tabela}${idSuffix}`;
        } else if (acao === 'LOGIN' || acao === 'LOGOUT') {
          const email = String(dadosDepois?.email ?? row.usuario_email ?? '');
          const tentativas = dadosDepois?.tentativas;
          const res = String(dadosDepois?.resultado ?? row.resultado ?? 'sucesso');
          const verb = acao === 'LOGIN' ? 'Login' : 'Logout';
          const base = email ? `${verb} (${email})` : verb;
          if (tentativas && Number(tentativas) > 1) descricao = `${base} — ${tentativas} tentativas`;
          else if (res === 'erro') descricao = `${base} — senha incorreta`;
          else descricao = base;
        } else if (acao === 'EXPORT' && dadosDepois) {
          const fmt = String(dadosDepois.formato ?? 'csv').toUpperCase();
          const total = Number(dadosDepois.total_registros ?? 0);
          descricao = `Exportou ${tabela} (${fmt}, ${total} registros)`;
        } else if (acao === 'CREATE') {
          descricao = `Criou ${tabela}${idSuffix}`;
        } else if (acao === 'DELETE') {
          descricao = `Excluiu ${tabela}${idSuffix}`;
        } else if (acao === 'CLOSE') {
          descricao = `Fechou ${tabela}${idSuffix}`;
        } else if (acao === 'APPROVE') {
          descricao = `Aprovou ${tabela}${idSuffix}`;
        } else if (acao === 'REJECT') {
          descricao = `Rejeitou ${tabela}${idSuffix}`;
        } else {
          descricao = `Atualizou ${tabela}${idSuffix}`;
        }

        return {
          id: row.id,
          usuario_id: row.usuario_id ?? null,
          usuario_nome: row.usuario_email ?? 'SISTEMA',
          acao,
          descricao,
          tag: tabela || null,
          data_hora: row.ocorreu_em ?? row.created_at,
          dados_antes: dadosAntes,
          dados_depois: dadosDepois,
          diferenca,
          resultado: String(row.resultado ?? 'sucesso'),
          registro_id: registroId,
          ip_address: row.ip_address ?? null,
          mensagem_erro: row.mensagem_erro ?? null,
        } as AuditoriaRow;
      });
    },
    enabled: !!tenantId,
  });
}

export function useCreateAuditoria() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditoria: AuditoriaInsert) => {
      await writeAuditLog({
        action: auditoria.acao,
        table: 'app_auditoria',
        recordId: auditoria.usuario_id ?? null,
        empresaId: user?.tenantId ?? null,
        source: 'use_auditoria_hook',
        metadata: {
          descricao: auditoria.descricao,
          tag: auditoria.tag ?? null,
          usuario_nome: auditoria.usuario_nome,
        },
      });

      return {
        id: crypto.randomUUID(),
        usuario_id: auditoria.usuario_id ?? null,
        usuario_nome: auditoria.usuario_nome,
        acao: auditoria.acao,
        descricao: auditoria.descricao,
        tag: auditoria.tag ?? null,
        data_hora: new Date().toISOString(),
        dados_antes: null,
        dados_depois: null,
        diferenca: null,
        resultado: 'sucesso',
        registro_id: null,
        ip_address: null,
        mensagem_erro: null,
      } satisfies AuditoriaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
    },
  });
}

// Hook para registrar ações de auditoria facilmente
export function useLogAuditoria() {
  const { user } = useAuth();
  const createAuditoria = useCreateAuditoria();

  const log = async (acao: string, descricao: string, tag?: string) => {
    if (!user) return;

    try {
      await createAuditoria.mutateAsync({
        usuario_id: user.id,
        usuario_nome: user.nome,
        acao,
        descricao,
        tag: tag || null,
      });
    } catch (error) {
      logger.error('register_audit_failed', { error: String(error) });
    }
  };

  return { log };
}
