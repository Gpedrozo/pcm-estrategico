import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, AlertTriangle, Clock, Database, Users, FileText, Wrench } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function MasterSystemMonitor() {
  const { data: healthData } = useQuery({
    queryKey: ['master-system-health'],
    queryFn: async () => {
      const start = performance.now();

      // Test DB connectivity
      const { count: osCount } = await supabase.from('ordens_servico').select('*', { count: 'exact', head: true });
      const { count: equipCount } = await supabase.from('equipamentos').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: auditCount } = await supabase.from('auditoria').select('*', { count: 'exact', head: true });
      const { count: secLogCount } = await supabase.from('security_logs').select('*', { count: 'exact', head: true });

      // Recent activity
      const { data: recentOS } = await supabase.from('ordens_servico').select('id').gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
      const { data: recentAudit } = await supabase.from('auditoria').select('id').gte('data_hora', new Date(Date.now() - 24*60*60*1000).toISOString());

      const responseTime = Math.round(performance.now() - start);

      return {
        dbOnline: true,
        responseTime,
        ordens: osCount ?? 0,
        equipamentos: equipCount ?? 0,
        usuarios: userCount ?? 0,
        auditorias: auditCount ?? 0,
        securityLogs: secLogCount ?? 0,
        recentOS: recentOS?.length ?? 0,
        recentAudit: recentAudit?.length ?? 0,
      };
    },
    refetchInterval: 15000,
  });

  const status = !healthData ? 'loading' : healthData.responseTime < 500 ? 'healthy' : healthData.responseTime < 2000 ? 'warning' : 'critical';
  const statusConfig = {
    loading: { color: 'bg-muted', label: 'Verificando...', icon: Clock },
    healthy: { color: 'bg-success', label: 'Operacional', icon: CheckCircle },
    warning: { color: 'bg-warning', label: 'Lento', icon: AlertTriangle },
    critical: { color: 'bg-destructive', label: 'Crítico', icon: AlertTriangle },
  };
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${cfg.color} animate-pulse`} />
              <div>
                <h3 className="text-lg font-semibold">Status do Sistema</h3>
                <p className="text-muted-foreground text-sm">Monitoramento em tempo real</p>
              </div>
            </div>
            <Badge className={`${cfg.color} text-white gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tempo de Resposta</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{healthData?.responseTime ?? '—'}ms</p>
            <Progress value={Math.min(((healthData?.responseTime ?? 0) / 3000) * 100, 100)} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt; 500ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Atividade (24h)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-3xl font-bold">{healthData?.recentOS ?? 0}</p>
                <p className="text-xs text-muted-foreground">Novas OS</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{healthData?.recentAudit ?? 0}</p>
                <p className="text-xs text-muted-foreground">Ações auditadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Resumo do Banco</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Ordens de Serviço', value: healthData?.ordens ?? 0, icon: FileText },
              { label: 'Equipamentos', value: healthData?.equipamentos ?? 0, icon: Wrench },
              { label: 'Usuários', value: healthData?.usuarios ?? 0, icon: Users },
              { label: 'Registros Auditoria', value: healthData?.auditorias ?? 0, icon: Activity },
              { label: 'Logs de Segurança', value: healthData?.securityLogs ?? 0, icon: Activity },
            ].map(item => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                <item.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{item.value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
