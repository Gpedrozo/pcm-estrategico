import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Lock, Key, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function MasterSecurity() {
  const { data: securityData, isLoading } = useQuery({
    queryKey: ['master-security'],
    queryFn: async () => {
      // Security logs
      const { data: recentLogs, count: totalLogs } = await supabase
        .from('security_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(20);

      // Failed attempts
      const { count: failedCount } = await supabase
        .from('security_logs')
        .select('*', { count: 'exact', head: true })
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());

      // Rate limits
      const { count: rateLimitCount } = await supabase
        .from('security_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'RATE_LIMIT_EXCEEDED')
        .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());

      // Login activity (from auditoria)
      const { count: loginCount } = await supabase
        .from('auditoria')
        .select('*', { count: 'exact', head: true })
        .eq('acao', 'LOGIN')
        .gte('data_hora', new Date(Date.now() - 24*60*60*1000).toISOString());

      return {
        recentLogs: recentLogs || [],
        totalLogs: totalLogs ?? 0,
        failedAttempts: failedCount ?? 0,
        rateLimits: rateLimitCount ?? 0,
        logins24h: loginCount ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  const securityScore = Math.max(0, 100 - (securityData?.failedAttempts ?? 0) * 5 - (securityData?.rateLimits ?? 0) * 10);

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${securityScore >= 80 ? 'bg-success/10' : securityScore >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
              <Shield className={`h-5 w-5 ${securityScore >= 80 ? 'text-success' : securityScore >= 50 ? 'text-warning' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{securityScore}%</p>
              <p className="text-xs text-muted-foreground">Score de Segurança</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{securityData?.failedAttempts ?? 0}</p>
              <p className="text-xs text-muted-foreground">Falhas (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Lock className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-2xl font-bold">{securityData?.rateLimits ?? 0}</p>
              <p className="text-xs text-muted-foreground">Rate Limits (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><Key className="h-5 w-5 text-info" /></div>
            <div>
              <p className="text-2xl font-bold">{securityData?.logins24h ?? 0}</p>
              <p className="text-xs text-muted-foreground">Logins (24h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Policies Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Políticas Ativas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'Row Level Security (RLS)', status: 'Ativo', ok: true },
              { name: 'Rate Limiting', status: 'Ativo', ok: true },
              { name: 'Security Definer Functions', status: 'Ativo', ok: true },
              { name: 'Auditoria de Ações', status: 'Ativo', ok: true },
              { name: 'Controle de Sessão', status: 'Ativo', ok: true },
              { name: 'Separação de Roles (user_roles)', status: 'Ativo', ok: true },
            ].map(policy => (
              <div key={policy.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm">{policy.name}</span>
                <Badge className={policy.ok ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive'} variant="outline">
                  <CheckCircle className="h-3 w-3 mr-1" /> {policy.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Eventos Recentes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="table-industrial w-full">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Recurso</th>
                <th>Status</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {!securityData?.recentLogs.length ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum evento registrado</td></tr>
              ) : (
                securityData.recentLogs.map(log => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
