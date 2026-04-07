import { supabase } from '@/integrations/supabase/client';

interface AuditLogRow {
  id: string;
  created_at: string;
  ocorreu_em: string | null;
  acao: string | null;
  tabela: string | null;
  registro_id: string | null;
  usuario_email: string | null;
  usuario_id: string | null;
  empresa_id: string | null;
  resultado: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  diferenca: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  correlacao_id: string | null;
  mensagem_erro: string | null;
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportAuditLogsCSV(empresaId: string, options?: {
  startDate?: string;
  endDate?: string;
  actionFilter?: string;
}): Promise<void> {
  let query = supabase
    .from('enterprise_audit_logs')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  if (options?.actionFilter && options.actionFilter !== 'ALL') {
    query = query.ilike('acao', `%${options.actionFilter}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao exportar audit logs: ${error.message}`);

  const logs = (data ?? []) as AuditLogRow[];

  const headers = [
    'Data/Hora',
    'Ação',
    'Tabela',
    'Registro ID',
    'Usuário',
    'Resultado',
    'IP',
    'Correlação ID',
    'Dados Antes',
    'Dados Depois',
    'Diferença',
  ];

  const rows = logs.map((log) => [
    new Date(log.ocorreu_em ?? log.created_at).toLocaleString('pt-BR'),
    log.acao ?? '',
    log.tabela ?? '',
    log.registro_id ?? '',
    log.usuario_email ?? 'SISTEMA',
    log.resultado ?? 'sucesso',
    log.ip_address ?? '',
    log.correlacao_id ?? '',
    log.dados_antes ? JSON.stringify(log.dados_antes) : '',
    log.dados_depois ? JSON.stringify(log.dados_depois) : '',
    log.diferenca ? JSON.stringify(log.diferenca) : '',
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit_log_${empresaId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
