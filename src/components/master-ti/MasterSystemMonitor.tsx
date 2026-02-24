import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, AlertTriangle, Clock, Database, Users, FileText, Wrench, BarChart3, ClipboardList, ShieldAlert, Package, Factory, Settings, Gauge, TrendingUp, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const MODULE_TABLES = [
  { module: 'Ordens de Serviço', table: 'ordens_servico' as const, icon: FileText, color: 'text-info' },
  { module: 'Equipamentos', table: 'equipamentos' as const, icon: Wrench, color: 'text-primary' },
  { module: 'Planos Preventivos', table: 'planos_preventivos' as const, icon: ClipboardList, color: 'text-success' },
  { module: 'Medições Preditivas', table: 'medicoes_preditivas' as const, icon: Gauge, color: 'text-warning' },
  { module: 'Inspeções', table: 'inspecoes' as const, icon: ShieldAlert, color: 'text-info' },
  { module: 'FMEA', table: 'fmea' as const, icon: BarChart3, color: 'text-destructive' },
  { module: 'Causa Raiz (RCA)', table: 'analise_causa_raiz' as const, icon: TrendingUp, color: 'text-warning' },
  { module: 'Melhorias', table: 'melhorias' as const, icon: Zap, color: 'text-success' },
  { module: 'Materiais', table: 'materiais' as const, icon: Package, color: 'text-primary' },
  { module: 'Mecânicos', table: 'mecanicos' as const, icon: Users, color: 'text-info' },
  { module: 'Fornecedores', table: 'fornecedores' as const, icon: Factory, color: 'text-muted-foreground' },
  { module: 'Contratos', table: 'contratos' as const, icon: FileText, color: 'text-warning' },
  { module: 'Documentos Técnicos', table: 'documentos_tecnicos' as const, icon: FileText, color: 'text-primary' },
  { module: 'Solicitações', table: 'solicitacoes_manutencao' as const, icon: ClipboardList, color: 'text-info' },
  { module: 'SSMA/Incidentes', table: 'incidentes_ssma' as const, icon: ShieldAlert, color: 'text-destructive' },
  { module: 'Componentes', table: 'componentes_equipamento' as const, icon: Settings, color: 'text-muted-foreground' },
  { module: 'Execuções OS', table: 'execucoes_os' as const, icon: Activity, color: 'text-success' },
  { module: 'Usuários', table: 'profiles' as const, icon: Users, color: 'text-primary' },
  { module: 'Auditoria', table: 'auditoria' as const, icon: FileText, color: 'text-warning' },
  { module: 'Security Logs', table: 'security_logs' as const, icon: ShieldAlert, color: 'text-destructive' },
  { module: 'Notificações', table: 'notificacoes' as const, icon: ClipboardList, color: 'text-info' },
  { module: 'Permissões Granulares', table: 'permissoes_granulares' as const, icon: Settings, color: 'text-primary' },
  { module: 'Configurações', table: 'configuracoes_sistema' as const, icon: Settings, color: 'text-muted-foreground' },
] as const;

export function MasterSystemMonitor() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['master-system-health-full'],
    queryFn: async () => {
      const start = performance.now();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [moduleCounts, recentOS, recentAudit, recentSolicit, recentSecurity] = await Promise.all([
        Promise.all(
          MODULE_TABLES.map(async (m) => {
            const t0 = performance.now();
            try {
              const { count, error } = await supabase.from(m.table).select('*', { count: 'exact', head: true });
              return { ...m, count: error ? -1 : (count ?? 0), responseTime: Math.round(performance.now() - t0) };
            } catch { return { ...m, count: -1, responseTime: Math.round(performance.now() - t0) }; }
          })
        ),
        supabase.from('ordens_servico').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
        supabase.from('auditoria').select('id', { count: 'exact', head: true }).gte('data_hora', oneDayAgo),
        supabase.from('solicitacoes_manutencao').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
        supabase.from('security_logs').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      ]);

      const responseTime = Math.round(performance.now() - start);

      return {
        responseTime,
        moduleCounts,
        recentOS24h: recentOS.count ?? 0,
        recentAudit24h: recentAudit.count ?? 0,
        recentSolicit24h: recentSolicit.count ?? 0,
        recentSecurity24h: recentSecurity.count ?? 0,
        totalRecords: moduleCounts.filter(m => m.count >= 0).reduce((a, b) => a + b.count, 0),
        activeModules: moduleCounts.filter(m => m.count > 0).length,
        errorModules: moduleCounts.filter(m => m.count === -1).length,
        avgResponseTime: Math.round(moduleCounts.reduce((a, b) => a + b.responseTime, 0) / moduleCounts.length),
      };
    },
    refetchInterval: 15000,
  });

  const status = !healthData ? 'loading' : healthData.errorModules > 0 ? 'critical' : healthData.responseTime < 500 ? 'healthy' : healthData.responseTime < 2000 ? 'warning' : 'critical';
  const statusConfig = {
    loading: { color: 'bg-muted', label: 'Verificando...', icon: Clock },
    healthy: { color: 'bg-success', label: 'Operacional', icon: CheckCircle },
    warning: { color: 'bg-warning', label: 'Lento', icon: AlertTriangle },
    critical: { color: 'bg-destructive', label: 'Crítico', icon: AlertTriangle },
  };
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Card key={i}><CardContent className="p-6 h-24 animate-pulse bg-muted/30" /></Card>)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* System Status Banner */}
      <Card className="border-2 border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${cfg.color} animate-pulse`} />
              <div>
                <h3 className="text-lg font-semibold">Status Geral do Sistema</h3>
                <p className="text-muted-foreground text-sm">Monitoramento em tempo real • Atualização a cada 15s</p>
              </div>
            </div>
            <Badge className={`${cfg.color} text-white gap-1 px-3 py-1`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Tempo Resposta', value: `${healthData?.responseTime ?? 0}ms`, icon: Clock, ok: (healthData?.responseTime ?? 0) < 500 },
          { label: 'Total Registros', value: (healthData?.totalRecords ?? 0).toLocaleString('pt-BR'), icon: Database, ok: true },
          { label: 'Módulos Ativos', value: `${healthData?.activeModules ?? 0}/${MODULE_TABLES.length}`, icon: Activity, ok: true },
          { label: 'Módulos com Erro', value: String(healthData?.errorModules ?? 0), icon: AlertTriangle, ok: (healthData?.errorModules ?? 0) === 0 },
          { label: 'OS (24h)', value: String(healthData?.recentOS24h ?? 0), icon: FileText, ok: true },
          { label: 'Auditorias (24h)', value: String(healthData?.recentAudit24h ?? 0), icon: BarChart3, ok: true },
          { label: 'Segurança (24h)', value: String(healthData?.recentSecurity24h ?? 0), icon: ShieldAlert, ok: (healthData?.recentSecurity24h ?? 0) < 50 },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-3 text-center">
              <m.icon className={`h-4 w-4 mx-auto mb-1 ${m.ok ? 'text-primary' : 'text-destructive'}`} />
              <p className="text-lg font-bold font-mono">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Performance do Banco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo total de resposta</span>
                <span className="font-mono font-bold">{healthData?.responseTime ?? 0}ms</span>
              </div>
              <Progress value={Math.min(((healthData?.responseTime ?? 0) / 3000) * 100, 100)} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média por módulo</span>
                <span className="font-mono font-bold">{healthData?.avgResponseTime ?? 0}ms</span>
              </div>
              <Progress value={Math.min(((healthData?.avgResponseTime ?? 0) / 500) * 100, 100)} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module-by-Module */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Monitoramento por Módulo ({MODULE_TABLES.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="table-industrial w-full">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Tabela</th>
                <th>Registros</th>
                <th>Tempo (ms)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {healthData?.moduleCounts.map(m => (
                <tr key={m.table}>
                  <td>
                    <div className="flex items-center gap-2">
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                      <span className="font-medium text-sm">{m.module}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{m.table}</td>
                  <td>
                    <Badge variant={m.count > 0 ? 'default' : 'secondary'} className="font-mono">
                      {m.count >= 0 ? m.count.toLocaleString('pt-BR') : 'ERRO'}
                    </Badge>
                  </td>
                  <td className={`font-mono text-xs ${m.responseTime > 300 ? 'text-warning' : 'text-muted-foreground'}`}>{m.responseTime}ms</td>
                  <td>
                    {m.count >= 0 ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-1" /> Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Erro
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
