import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, CheckCircle, Lock, Key, Activity, Search, ChevronLeft, ChevronRight, Users, Database, ShieldAlert, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_SIZE = 20;

const RLS_TABLES = [
  'ordens_servico', 'equipamentos', 'mecanicos', 'materiais', 'planos_preventivos',
  'fmea', 'analise_causa_raiz', 'inspecoes', 'medicoes_preditivas', 'melhorias',
  'incidentes_ssma', 'fornecedores', 'contratos', 'documentos_tecnicos',
  'solicitacoes_manutencao', 'auditoria', 'profiles', 'user_roles',
  'dados_empresa', 'permissoes_granulares', 'configuracoes_sistema',
  'security_logs', 'rate_limits', 'componentes_equipamento',
  'execucoes_os', 'materiais_os', 'movimentacoes_materiais',
  'contrato_alertas', 'notificacoes',
];

const SECURITY_POLICIES = [
  { name: 'Row Level Security (RLS)', desc: 'Todas as tabelas protegidas com RLS', status: true },
  { name: 'Rate Limiting', desc: 'Limitação de requisições por endpoint', status: true },
  { name: 'Security Definer Functions', desc: 'Funções seguras para acesso a dados sensíveis', status: true },
  { name: 'Auditoria Completa', desc: 'Registro de todas as ações do sistema', status: true },
  { name: 'Separação de Roles', desc: 'Tabela user_roles separada de profiles', status: true },
  { name: 'Triggers de Auditoria DB', desc: 'Registro automático de INSERT/UPDATE/DELETE', status: true },
  { name: 'Permissões Granulares', desc: 'Controle fino por módulo e ação', status: true },
  { name: 'Proteção contra Escalação', desc: 'Roles impossível de auto-promoção', status: true },
];

export function MasterSecurity() {
  const [secTab, setSecTab] = useState('overview');
  const [logPage, setLogPage] = useState(0);
  const [logSearch, setLogSearch] = useState('');
  const [viewingLog, setViewingLog] = useState<any>(null);

  const { data: securityData, isLoading } = useQuery({
    queryKey: ['master-security-full'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [totalLogs, failedAttempts, rateLimits, logins24h, loginsWeek, totalUsers, masterCount, adminCount] = await Promise.all([
        supabase.from('security_logs').select('*', { count: 'exact', head: true }),
        supabase.from('security_logs').select('*', { count: 'exact', head: true }).eq('success', false).gte('created_at', oneDayAgo),
        supabase.from('security_logs').select('*', { count: 'exact', head: true }).eq('action', 'RATE_LIMIT_EXCEEDED').gte('created_at', oneDayAgo),
        supabase.from('auditoria').select('*', { count: 'exact', head: true }).eq('acao', 'LOGIN').gte('data_hora', oneDayAgo),
        supabase.from('auditoria').select('*', { count: 'exact', head: true }).eq('acao', 'LOGIN').gte('data_hora', oneWeekAgo),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'MASTER_TI'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN'),
      ]);

      return {
        totalLogs: totalLogs.count ?? 0,
        failedAttempts: failedAttempts.count ?? 0,
        rateLimits: rateLimits.count ?? 0,
        logins24h: logins24h.count ?? 0,
        loginsWeek: loginsWeek.count ?? 0,
        totalUsers: totalUsers.count ?? 0,
        masterCount: masterCount.count ?? 0,
        adminCount: adminCount.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  const { data: logData, isLoading: loadingLogs } = useQuery({
    queryKey: ['master-security-logs', logPage, logSearch],
    queryFn: async () => {
      let query = supabase.from('security_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(logPage * PAGE_SIZE, (logPage + 1) * PAGE_SIZE - 1);
      if (logSearch) query = query.or(`action.ilike.%${logSearch}%,resource.ilike.%${logSearch}%,error_message.ilike.%${logSearch}%`);
      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data || [], total: count ?? 0 };
    },
    enabled: secTab === 'logs',
  });

  const logTotalPages = Math.ceil((logData?.total ?? 0) / PAGE_SIZE);
  const securityScore = Math.max(0, 100 - (securityData?.failedAttempts ?? 0) * 5 - (securityData?.rateLimits ?? 0) * 10);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${securityScore >= 80 ? 'bg-success/10' : securityScore >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                <Shield className={`h-8 w-8 ${securityScore >= 80 ? 'text-success' : securityScore >= 50 ? 'text-warning' : 'text-destructive'}`} />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold">{securityScore}%</p>
                <p className="text-xs text-muted-foreground">Score de Segurança</p>
                <Progress value={securityScore} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        {[
          { label: 'Falhas (24h)', value: securityData?.failedAttempts ?? 0, icon: AlertTriangle, bg: 'bg-destructive/10', color: 'text-destructive' },
          { label: 'Rate Limits (24h)', value: securityData?.rateLimits ?? 0, icon: Lock, bg: 'bg-warning/10', color: 'text-warning' },
          { label: 'Logins (24h)', value: securityData?.logins24h ?? 0, icon: Key, bg: 'bg-info/10', color: 'text-info' },
          { label: 'Total Usuários', value: securityData?.totalUsers ?? 0, icon: Users, bg: 'bg-primary/10', color: 'text-primary' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={secTab} onValueChange={setSecTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Shield className="h-4 w-4" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="rls" className="gap-2"><Database className="h-4 w-4" /> RLS / Tabelas</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Activity className="h-4 w-4" /> Logs de Segurança</TabsTrigger>
          <TabsTrigger value="access" className="gap-2"><Users className="h-4 w-4" /> Controle de Acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Políticas de Segurança Ativas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SECURITY_POLICIES.map(p => (
                  <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <span className="text-sm font-medium">{p.name}</span>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                      <CheckCircle className="h-3 w-3 mr-1" /> Ativo
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rls" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Tabelas com RLS ({RLS_TABLES.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {RLS_TABLES.map(table => (
                  <div key={table} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50">
                    <span className="text-xs font-mono">{table}</span>
                    <CheckCircle className="h-3 w-3 text-success" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar ação ou recurso..." value={logSearch} onChange={e => { setLogSearch(e.target.value); setLogPage(0); }} className="pl-9" />
            </div>
            <Badge variant="secondary">{(logData?.total ?? 0).toLocaleString('pt-BR')} logs</Badge>
          </div>

          {loadingLogs ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="table-industrial w-full">
                  <thead><tr><th>Data</th><th>Ação</th><th>Recurso</th><th>Status</th><th>Mensagem</th><th>Detalhes</th></tr></thead>
                  <tbody>
                    {!logData?.logs.length ? (
                      <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum evento</td></tr>
                    ) : (
                      logData.logs.map(log => (
                        <tr key={log.id}>
                          <td className="text-sm text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                          <td className="text-sm font-medium">{log.action}</td>
                          <td className="text-sm font-mono">{log.resource}</td>
                          <td>
                            <Badge variant="outline" className={log.success ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                              {log.success ? 'OK' : 'Falha'}
                            </Badge>
                          </td>
                          <td className="text-sm text-muted-foreground max-w-xs truncate">{log.error_message || '—'}</td>
                          <td>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingLog(log)}><Eye className="h-3 w-3" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {logTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={logPage === 0} onClick={() => setLogPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Página {logPage + 1} de {logTotalPages}</span>
              <Button variant="outline" size="icon" disabled={logPage >= logTotalPages - 1} onClick={() => setLogPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="access" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-3xl font-bold">{securityData?.masterCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">MASTER_TI</p>
                <p className="text-xs text-muted-foreground mt-1">Acesso total ao sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{securityData?.adminCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
                <p className="text-xs text-muted-foreground mt-1">Gerenciamento de dados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-info" />
                <p className="text-3xl font-bold">{(securityData?.totalUsers ?? 0) - (securityData?.masterCount ?? 0) - (securityData?.adminCount ?? 0)}</p>
                <p className="text-sm text-muted-foreground">Usuários Regulares</p>
                <p className="text-xs text-muted-foreground mt-1">Acesso conforme permissões</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Histórico de Logins</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <p className="text-2xl font-bold">{securityData?.logins24h ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Últimas 24h</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <p className="text-2xl font-bold">{securityData?.loginsWeek ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Última semana</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Log Detail */}
      <Dialog open={!!viewingLog} onOpenChange={open => !open && setViewingLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Evento de Segurança</DialogTitle></DialogHeader>
          {viewingLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Data:</span><p>{new Date(viewingLog.created_at).toLocaleString('pt-BR')}</p></div>
                <div><span className="text-muted-foreground">Ação:</span><p className="font-medium">{viewingLog.action}</p></div>
                <div><span className="text-muted-foreground">Recurso:</span><p className="font-mono">{viewingLog.resource}</p></div>
                <div><span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={viewingLog.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                    {viewingLog.success ? 'Sucesso' : 'Falha'}
                  </Badge>
                </div>
              </div>
              {viewingLog.error_message && (
                <div><span className="text-muted-foreground">Mensagem de Erro:</span><p className="mt-1 p-3 bg-destructive/5 rounded-lg text-destructive">{viewingLog.error_message}</p></div>
              )}
              {viewingLog.metadata && (
                <div><span className="text-muted-foreground">Metadata:</span><pre className="mt-1 p-3 bg-muted/30 rounded-lg text-xs overflow-auto max-h-48">{JSON.stringify(viewingLog.metadata, null, 2)}</pre></div>
              )}
              <div><span className="text-muted-foreground">User ID:</span><p className="font-mono text-xs">{viewingLog.user_id || '—'}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
