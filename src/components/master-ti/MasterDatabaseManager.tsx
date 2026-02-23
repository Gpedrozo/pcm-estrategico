import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Table2, HardDrive, CheckCircle2, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewingTable, setViewingTable] = useState<TableName | null>(null);
  const [viewPage, setViewPage] = useState(0);

  const { data: tableCounts, isLoading } = useQuery({
    queryKey: ['master-db-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        TABLES.map(async (table) => {
          try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            counts[table] = error ? -1 : (count ?? 0);
          } catch {
            counts[table] = -1;
          }
        })
      );
      return counts;
    },
    refetchInterval: 30000,
  });

  // View table data
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
        // Fallback without order if created_at doesn't exist
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

  const totalRecords = tableCounts ? Object.values(tableCounts).filter(v => v >= 0).reduce((a, b) => a + b, 0) : 0;
  const activeTables = tableCounts ? Object.values(tableCounts).filter(v => v > 0).length : 0;

  const filteredTables = TABLES.filter(t => !search || t.includes(search.toLowerCase()));
  const viewTotalPages = Math.ceil((tableData?.total ?? 0) / VIEW_PAGE_SIZE);

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Database className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{TABLES.length}</p>
              <p className="text-xs text-muted-foreground">Tabelas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><HardDrive className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold">{totalRecords.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Registros totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><CheckCircle2 className="h-5 w-5 text-info" /></div>
            <div>
              <p className="text-2xl font-bold">{activeTables}</p>
              <p className="text-xs text-muted-foreground">Tabelas com dados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filtrar tabelas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTables.map(table => {
          const count = tableCounts?.[table] ?? 0;
          const hasData = count > 0;
          return (
            <Card key={table} className={`transition-colors ${hasData ? '' : 'opacity-60'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium font-mono">{table}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasData ? 'default' : 'secondary'} className="font-mono">
                    {count >= 0 ? count.toLocaleString('pt-BR') : 'erro'}
                  </Badge>
                  {hasData && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewingTable(table); setViewPage(0); }} title="Visualizar dados">
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Data Dialog */}
      <Dialog open={!!viewingTable} onOpenChange={open => { if (!open) setViewingTable(null); }}>
        <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Table2 className="h-5 w-5" /> {viewingTable}
              <Badge variant="secondary" className="ml-2">{tableData?.total ?? 0} registros</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loadingData ? (
              <div className="space-y-2 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !tableData?.rows.length ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum registro</p>
            ) : (
              <table className="table-industrial w-full text-xs">
                <thead>
                  <tr>
                    {Object.keys(tableData.rows[0]).map(col => (
                      <th key={col} className="whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row: any, i: number) => (
                    <tr key={i}>
                      {Object.values(row).map((val: any, j: number) => (
                        <td key={j} className="max-w-[200px] truncate whitespace-nowrap" title={String(val ?? '')}>
                          {val === null ? <span className="text-muted-foreground italic">null</span> : typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val).slice(0, 80)}
                        </td>
                      ))}
                    </tr>
                  ))}
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
