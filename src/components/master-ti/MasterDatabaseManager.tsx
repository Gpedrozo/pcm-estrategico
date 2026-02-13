import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Table2, HardDrive, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TABLES = [
  'ordens_servico', 'equipamentos', 'mecanicos', 'materiais', 'planos_preventivos',
  'execucoes_os', 'materiais_os', 'movimentacoes_materiais', 'fmea', 'analise_causa_raiz',
  'acoes_corretivas', 'inspecoes', 'anomalias_inspecao', 'medicoes_preditivas',
  'melhorias', 'incidentes_ssma', 'permissoes_trabalho', 'fornecedores', 'contratos',
  'avaliacoes_fornecedores', 'documentos_tecnicos', 'solicitacoes_manutencao',
  'auditoria', 'profiles', 'user_roles', 'plantas', 'areas', 'sistemas',
  'componentes_equipamento', 'configuracoes_sistema', 'security_logs', 'rate_limits',
] as const;

type TableName = typeof TABLES[number];

export function MasterDatabaseManager() {
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

  const totalRecords = tableCounts ? Object.values(tableCounts).filter(v => v >= 0).reduce((a, b) => a + b, 0) : 0;
  const activeTables = tableCounts ? Object.values(tableCounts).filter(v => v > 0).length : 0;

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

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

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TABLES.map(table => {
          const count = tableCounts?.[table] ?? 0;
          const hasData = count > 0;
          return (
            <Card key={table} className={`transition-colors ${hasData ? '' : 'opacity-60'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium font-mono">{table}</p>
                  </div>
                </div>
                <Badge variant={hasData ? 'default' : 'secondary'} className="font-mono">
                  {count >= 0 ? count.toLocaleString('pt-BR') : 'erro'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
