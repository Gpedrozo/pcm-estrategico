import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Download, ChevronLeft, ChevronRight, Activity, Database, Clock, BarChart3, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_SIZE = 25;

export function MasterAuditLogs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('auditoria');
  const [viewingLog, setViewingLog] = useState<any>(null);

  // Auditoria manual logs
  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['master-audit-logs', page, search, actionFilter],
    queryFn: async () => {
      let query = supabase.from('auditoria').select('*', { count: 'exact' }).order('data_hora', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (search) query = query.or(`usuario_nome.ilike.%${search}%,acao.ilike.%${search}%,descricao.ilike.%${search}%,tag.ilike.%${search}%`);
      if (actionFilter !== 'ALL') query = query.ilike('acao', `%${actionFilter}%`);
      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data || [], total: count ?? 0 };
    },
    enabled: activeTab === 'auditoria',
  });

  // DB audit trail
  const [dbPage, setDbPage] = useState(0);
  const [dbSearch, setDbSearch] = useState('');
  const [dbTableFilter, setDbTableFilter] = useState('ALL');
  const [viewingDbLog, setViewingDbLog] = useState<any>(null);

  const { data: dbAuditData, isLoading: loadingDbAudit } = useQuery({
    queryKey: ['master-db-audit-logs', dbPage, dbSearch, dbTableFilter],
    queryFn: async () => {
      let query = supabase.from('auditoria_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(dbPage * PAGE_SIZE, (dbPage + 1) * PAGE_SIZE - 1);
      if (dbSearch) query = query.or(`tabela.ilike.%${dbSearch}%,operacao.ilike.%${dbSearch}%`);
      if (dbTableFilter !== 'ALL') query = query.eq('tabela', dbTableFilter);
      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data || [], total: count ?? 0 };
    },
    enabled: activeTab === 'db_audit',
  });

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ['master-audit-stats'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [totalAudit, todayAudit, totalDbAudit, todayDbAudit] = await Promise.all([
        supabase.from('auditoria').select('*', { count: 'exact', head: true }),
        supabase.from('auditoria').select('*', { count: 'exact', head: true }).gte('data_hora', oneDayAgo),
        supabase.from('auditoria_logs').select('*', { count: 'exact', head: true }),
        supabase.from('auditoria_logs').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      ]);
      return { totalAudit: totalAudit.count ?? 0, todayAudit: todayAudit.count ?? 0, totalDbAudit: totalDbAudit.count ?? 0, todayDbAudit: todayDbAudit.count ?? 0 };
    },
  });

  const totalPages = Math.ceil((auditData?.total ?? 0) / PAGE_SIZE);
  const dbTotalPages = Math.ceil((dbAuditData?.total ?? 0) / PAGE_SIZE);

  const actionColor = (acao: string) => {
    const a = acao.toUpperCase();
    if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'bg-info/10 text-info border-info/20';
    if (a.includes('CRIAR') || a.includes('CADASTR') || a.includes('INSERT')) return 'bg-success/10 text-success border-success/20';
    if (a.includes('EDITAR') || a.includes('ATUALIZ') || a.includes('UPDATE') || a.includes('FECHAR')) return 'bg-warning/10 text-warning border-warning/20';
    if (a.includes('EXCLUIR') || a.includes('DELET') || a.includes('DELETE')) return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-secondary text-secondary-foreground';
  };

  const handleExport = () => {
    if (!auditData?.logs.length) return;
    const csv = ['Data/Hora,Usuário,Ação,Descrição,TAG']
      .concat(auditData.logs.map(l => `"${new Date(l.data_hora).toLocaleString('pt-BR')}","${l.usuario_nome}","${l.acao}","${l.descricao}","${l.tag || ''}"`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ações', value: statsData?.totalAudit ?? 0, icon: Activity, bg: 'bg-primary/10' },
          { label: 'Ações (24h)', value: statsData?.todayAudit ?? 0, icon: Clock, bg: 'bg-info/10' },
          { label: 'DB Changes Total', value: statsData?.totalDbAudit ?? 0, icon: Database, bg: 'bg-warning/10' },
          { label: 'DB Changes (24h)', value: statsData?.todayDbAudit ?? 0, icon: BarChart3, bg: 'bg-success/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="auditoria" className="gap-2"><Activity className="h-4 w-4" /> Ações do Sistema</TabsTrigger>
          <TabsTrigger value="db_audit" className="gap-2"><Database className="h-4 w-4" /> Alterações no Banco</TabsTrigger>
        </TabsList>

        <TabsContent value="auditoria" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
              </div>
              <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as ações</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="CRIAR">Criar</SelectItem>
                  <SelectItem value="EDITAR">Editar</SelectItem>
                  <SelectItem value="EXCLUIR">Excluir</SelectItem>
                  <SelectItem value="ATUALIZAR">Atualizar</SelectItem>
                  <SelectItem value="FECHAR">Fechar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{(auditData?.total ?? 0).toLocaleString('pt-BR')} registros</Badge>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1"><Download className="h-4 w-4" /> CSV</Button>
            </div>
          </div>

          {loadingAudit ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="table-industrial w-full">
                  <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Descrição</th><th>TAG</th></tr></thead>
                  <tbody>
                    {!auditData?.logs.length ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro</td></tr>
                    ) : (
                      auditData.logs.map(log => (
                        <tr key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewingLog(log)}>
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
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="db_audit" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tabela ou operação..." value={dbSearch} onChange={e => { setDbSearch(e.target.value); setDbPage(0); }} className="pl-9" />
            </div>
            <Select value={dbTableFilter} onValueChange={v => { setDbTableFilter(v); setDbPage(0); }}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as tabelas</SelectItem>
                {['ordens_servico', 'equipamentos', 'materiais', 'mecanicos', 'planos_preventivos', 'contratos', 'fornecedores', 'profiles', 'user_roles', 'dados_empresa', 'configuracoes_sistema'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingDbAudit ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="table-industrial w-full">
                  <thead><tr><th>Data</th><th>Tabela</th><th>Operação</th><th>Registro ID</th><th>Detalhes</th></tr></thead>
                  <tbody>
                    {!dbAuditData?.logs.length ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro de alteração</td></tr>
                    ) : (
                      dbAuditData.logs.map(log => (
                        <tr key={log.id}>
                          <td className="text-sm text-muted-foreground whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}</td>
                          <td className="font-mono text-sm">{log.tabela}</td>
                          <td><Badge variant="outline" className={actionColor(log.operacao)}>{log.operacao}</Badge></td>
                          <td className="font-mono text-xs text-muted-foreground">{log.registro_id?.toString().slice(0, 8)}...</td>
                          <td>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingDbLog(log)} title="Ver detalhes">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {dbTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={dbPage === 0} onClick={() => setDbPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Página {dbPage + 1} de {dbTotalPages}</span>
              <Button variant="outline" size="icon" disabled={dbPage >= dbTotalPages - 1} onClick={() => setDbPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Audit Detail Dialog */}
      <Dialog open={!!viewingLog} onOpenChange={open => !open && setViewingLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Ação</DialogTitle></DialogHeader>
          {viewingLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Data/Hora:</span><p className="font-medium">{new Date(viewingLog.data_hora).toLocaleString('pt-BR')}</p></div>
                <div><span className="text-muted-foreground">Usuário:</span><p className="font-medium">{viewingLog.usuario_nome}</p></div>
                <div><span className="text-muted-foreground">Ação:</span><Badge variant="outline" className={actionColor(viewingLog.acao)}>{viewingLog.acao}</Badge></div>
                <div><span className="text-muted-foreground">TAG:</span><p className="font-mono">{viewingLog.tag || '—'}</p></div>
              </div>
              <div><span className="text-muted-foreground">Descrição:</span><p className="mt-1 p-3 bg-muted/30 rounded-lg">{viewingLog.descricao}</p></div>
              <div><span className="text-muted-foreground">ID do Registro:</span><p className="font-mono text-xs">{viewingLog.id}</p></div>
              <div><span className="text-muted-foreground">ID do Usuário:</span><p className="font-mono text-xs">{viewingLog.usuario_id || '—'}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DB Audit Detail Dialog */}
      <Dialog open={!!viewingDbLog} onOpenChange={open => !open && setViewingDbLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Detalhes da Alteração no Banco</DialogTitle></DialogHeader>
          {viewingDbLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div><span className="text-muted-foreground">Tabela:</span><p className="font-mono font-medium">{viewingDbLog.tabela}</p></div>
                <div><span className="text-muted-foreground">Operação:</span><Badge variant="outline" className={actionColor(viewingDbLog.operacao)}>{viewingDbLog.operacao}</Badge></div>
                <div><span className="text-muted-foreground">Data:</span><p>{viewingDbLog.created_at ? new Date(viewingDbLog.created_at).toLocaleString('pt-BR') : '—'}</p></div>
              </div>
              {viewingDbLog.dados_antes && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">Dados Antes:</p>
                  <pre className="bg-muted/30 p-3 rounded-lg overflow-auto text-xs max-h-48">{JSON.stringify(viewingDbLog.dados_antes, null, 2)}</pre>
                </div>
              )}
              {viewingDbLog.dados_depois && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">Dados Depois:</p>
                  <pre className="bg-muted/30 p-3 rounded-lg overflow-auto text-xs max-h-48">{JSON.stringify(viewingDbLog.dados_depois, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
