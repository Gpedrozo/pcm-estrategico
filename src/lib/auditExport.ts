import { supabase } from '@/integrations/supabase/client';

interface AuditLogRow {
  id: string;
  created_at: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  actor_email: string | null;
  actor_user_id: string | null;
  empresa_id: string | null;
  source: string | null;
  severity: string | null;
  metadata: Record<string, unknown> | null;
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
    .from('audit_logs')
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
    query = query.ilike('action', `%${options.actionFilter}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao exportar audit logs: ${error.message}`);

  const logs = (data ?? []) as AuditLogRow[];

  const headers = [
    'Data/Hora',
    'Ação',
    'Tabela',
    'Record ID',
    'Usuário',
    'Severidade',
    'Source',
    'Metadata',
  ];

  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString('pt-BR'),
    log.action,
    log.table_name ?? '',
    log.record_id ?? '',
    log.actor_email ?? 'SISTEMA',
    log.severity ?? 'info',
    log.source ?? '',
    log.metadata ? JSON.stringify(log.metadata) : '',
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
