import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Table2, HardDrive, CheckCircle2, Search, Eye, ChevronLeft, ChevronRight, Edit2, Save, X, Loader2, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLogAuditoria } from '@/hooks/useAuditoria';

const TABLES = [
  'ordens_servico', 'equipamentos', 'mecanicos', 'materiais', 'planos_preventivos',
  'execucoes_os', 'materiais_os', 'movimentacoes_materiais', 'fmea', 'analise_causa_raiz',
  'acoes_corretivas', 'inspecoes', 'anomalias_inspecao', 'medicoes_preditivas',
  'melhorias', 'incidentes_ssma', 'permissoes_trabalho', 'fornecedores', 'contratos',
  'avaliacoes_fornecedores', 'documentos_tecnicos', 'solicitacoes_manutencao',
  'auditoria', 'auditoria_logs', 'profiles', 'user_roles', 'plantas', 'areas', 'sistemas',
  'componentes_equipamento', 'configuracoes_sistema', 'security_logs', 'rate_limits',
  'dados_empresa', 'permissoes_granulares', 'ai_root_cause_analysis', 'contrato_alertas',
  'notificacoes',
] as const;

type TableName = typeof TABLES[number];
const VIEW_PAGE_SIZE = 20;

export function MasterDatabaseManager() {
  const { toast } = useToast();
  const { log } = useLogAuditoria();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewingTable, setViewingTable] = useState<TableName | null>(null);
  const [viewPage, setViewPage] = useState(0);
  const [editingRow, setEditingRow] = useState<{ idx: number; data: Record<string, any> } | null>(null);

  const { data: tableCounts, isLoading } = useQuery({
    queryKey: ['master-db-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        TABLES.map(async (table) => {
          try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            counts[table] = error ? -1 : (count ?? 0);
          } catch { counts[table] = -1; }
        })
      );
      return counts;
    },
    refetchInterval: 30000,
  });

  const { data: tableData, isLoading: loadingData } = useQuery({
    queryKey: ['master-db-view', viewingTable, viewPage],
    queryFn: async () => {
      if (!viewingTable) return null;
      const { data, count, error } = await supabase
        .from(viewingTable)
        .select('*', { count: 'exact' })
        .range(viewPage * VIEW_PAGE_SIZE, (viewPage + 1) * VIEW_PAGE_SIZE - 1)
        .order('created_at' as any, { ascending: false });

      if (error) {
        const { data: d2, count: c2, error: e2 } = await supabase
          .from(viewingTable)
          .select('*', { count: 'exact' })
          .range(viewPage * VIEW_PAGE_SIZE, (viewPage + 1) * VIEW_PAGE_SIZE - 1);
        if (e2) throw e2;
        return { rows: d2 || [], total: c2 ?? 0 };
      }
      return { rows: data || [], total: count ?? 0 };
    },
    enabled: !!viewingTable,
  });

  const updateRowMutation = useMutation({
    mutationFn: async ({ table, id, updates }: { table: string; id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from(table as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-db-view', viewingTable] });
      toast({ title: 'Registro atualizado' });
      log('EDITAR_REGISTRO_DB', `Registro editado na tabela ${viewingTable}`, 'MASTER_TI');
      setEditingRow(null);
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const totalRecords = tableCounts ? Object.values(tableCounts).filter(v => v >= 0).reduce((a, b) => a + b, 0) : 0;
  const activeTables = tableCounts ? Object.values(tableCounts).filter(v => v > 0).length : 0;
  const filteredTables = TABLES.filter(t => !search || t.includes(search.toLowerCase()));
  const viewTotalPages = Math.ceil((tableData?.total ?? 0) / VIEW_PAGE_SIZE);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Tabelas', value: TABLES.length, icon: Database, bg: 'bg-primary/10' },
          { label: 'Registros totais', value: totalRecords.toLocaleString('pt-BR'), icon: HardDrive, bg: 'bg-success/10' },
          { label: 'Tabelas com dados', value: activeTables, icon: CheckCircle2, bg: 'bg-info/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filtrar tabelas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['master-db-counts'] })} title="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTables.map(table => {
          const count = tableCounts?.[table] ?? 0;
          const hasData = count > 0;
          return (
            <Card key={table} className={`transition-colors cursor-pointer hover:border-primary/50 ${hasData ? '' : 'opacity-60'}`}
              onClick={() => { setViewingTable(table); setViewPage(0); setEditingRow(null); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium font-mono">{table}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasData ? 'default' : 'secondary'} className="font-mono">
                    {count >= 0 ? count.toLocaleString('pt-BR') : 'erro'}
                  </Badge>
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Data Dialog */}
      <Dialog open={!!viewingTable} onOpenChange={open => { if (!open) { setViewingTable(null); setEditingRow(null); } }}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Table2 className="h-5 w-5" /> {viewingTable}
              <Badge variant="secondary" className="ml-2">{tableData?.total ?? 0} registros</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loadingData ? (
              <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !tableData?.rows.length ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</p>
            ) : (
              <table className="table-industrial w-full text-xs">
                <thead>
                  <tr>
                    <th className="w-16">Ações</th>
                    {Object.keys(tableData.rows[0]).map(col => (
                      <th key={col} className="whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row: any, i: number) => {
                    const isEditing = editingRow?.idx === i;
                    return (
                      <tr key={i}>
                        <td>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => {
                                  const { id, created_at, updated_at, ...updates } = editingRow.data;
                                  updateRowMutation.mutate({ table: viewingTable!, id: row.id, updates });
                                }}
                                disabled={updateRowMutation.isPending}>
                                {updateRowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 text-success" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingRow(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => setEditingRow({ idx: i, data: { ...row } })}
                              title="Editar registro">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                        {Object.entries(row).map(([col, val]: [string, any], j: number) => (
                          <td key={j} className="max-w-[200px] whitespace-nowrap">
                            {isEditing && col !== 'id' && col !== 'created_at' && col !== 'updated_at' ? (
                              <Input
                                className="h-6 text-xs min-w-[120px]"
                                value={editingRow.data[col] === null ? '' : typeof editingRow.data[col] === 'object' ? JSON.stringify(editingRow.data[col]) : String(editingRow.data[col])}
                                onChange={e => setEditingRow(prev => prev ? { ...prev, data: { ...prev.data, [col]: e.target.value || null } } : null)}
                              />
                            ) : (
                              <span className="truncate block" title={String(val ?? '')}>
                                {val === null ? <span className="text-muted-foreground italic">null</span> : typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val).slice(0, 80)}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {viewTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" disabled={viewPage === 0} onClick={() => setViewPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Página {viewPage + 1} de {viewTotalPages}</span>
              <Button variant="outline" size="sm" disabled={viewPage >= viewTotalPages - 1} onClick={() => setViewPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
