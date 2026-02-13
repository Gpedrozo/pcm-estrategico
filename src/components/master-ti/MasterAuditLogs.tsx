import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 20;

export function MasterAuditLogs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['master-audit-logs', page, search],
    queryFn: async () => {
      let query = supabase
        .from('auditoria')
        .select('*', { count: 'exact' })
        .order('data_hora', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`usuario_nome.ilike.%${search}%,acao.ilike.%${search}%,descricao.ilike.%${search}%`);
      }

      const { data: logs, count, error } = await query;
      if (error) throw error;
      return { logs: logs || [], total: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const actionColor = (acao: string) => {
    if (acao.includes('LOGIN') || acao.includes('LOGOUT')) return 'bg-info/10 text-info border-info/20';
    if (acao.includes('CRIAR') || acao.includes('CADASTRAR')) return 'bg-success/10 text-success border-success/20';
    if (acao.includes('EDITAR') || acao.includes('ATUALIZAR') || acao.includes('FECHAR')) return 'bg-warning/10 text-warning border-warning/20';
    if (acao.includes('EXCLUIR') || acao.includes('DELETAR')) return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-secondary text-secondary-foreground';
  };

  const handleExport = () => {
    if (!data?.logs.length) return;
    const csv = ['Data/Hora,Usuário,Ação,Descrição,TAG']
      .concat(data.logs.map(l => `"${new Date(l.data_hora).toLocaleString('pt-BR')}","${l.usuario_nome}","${l.acao}","${l.descricao}","${l.tag || ''}"`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuário, ação ou descrição..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{data?.total.toLocaleString('pt-BR')} registros</Badge>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <table className="table-industrial w-full">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Descrição</th>
                <th>TAG</th>
              </tr>
            </thead>
            <tbody>
              {!data?.logs.length ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum registro encontrado
                </td></tr>
              ) : (
                data.logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-sm text-muted-foreground whitespace-nowrap">{new Date(log.data_hora).toLocaleString('pt-BR')}</td>
                    <td className="font-medium text-sm">{log.usuario_nome}</td>
                    <td><Badge variant="outline" className={actionColor(log.acao)}>{log.acao}</Badge></td>
                    <td className="text-sm text-muted-foreground max-w-xs truncate">{log.descricao}</td>
                    <td className="text-sm font-mono">{log.tag || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
