import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, CheckCircle, AlertTriangle, XCircle, Database, Clock, Server, Shield } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  icon: React.ElementType;
}

const STATUS_CONFIG = {
  operational: { label: 'Operacional', color: 'bg-green-500', badge: 'default' as const, icon: CheckCircle },
  degraded: { label: 'Degradado', color: 'bg-yellow-500', badge: 'secondary' as const, icon: AlertTriangle },
  down: { label: 'IndisponÃ­vel', color: 'bg-red-500', badge: 'destructive' as const, icon: XCircle },
};

export default function SystemStatusPage() {
  const { tenantId } = useAuth();

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['system-status', tenantId],
    queryFn: async () => {
      const checks: ServiceStatus[] = [];

      // 1. Supabase DB health
      const dbStart = performance.now();
      try {
        const { error } = await supabase.from('empresas').select('id', { count: 'exact', head: true });
        const dbLatency = Math.round(performance.now() - dbStart);
        checks.push({
          name: 'Banco de Dados',
          status: error ? 'down' : dbLatency > 3000 ? 'degraded' : 'operational',
          latency: dbLatency,
          icon: Database,
        });
      } catch {
        checks.push({ name: 'Banco de Dados', status: 'down', latency: 0, icon: Database });
      }

      // 2. Auth service
      const authStart = performance.now();
      try {
        const { error } = await supabase.auth.getSession();
        const authLatency = Math.round(performance.now() - authStart);
        checks.push({
          name: 'AutenticaÃ§Ã£o',
          status: error ? 'degraded' : authLatency > 3000 ? 'degraded' : 'operational',
          latency: authLatency,
          icon: Shield,
        });
      } catch {
        checks.push({ name: 'AutenticaÃ§Ã£o', status: 'down', latency: 0, icon: Shield });
      }

      // 3. Storage service (check bucket list)
      const storageStart = performance.now();
      try {
        const { error } = await supabase.storage.listBuckets();
        const storageLatency = Math.round(performance.now() - storageStart);
        checks.push({
          name: 'Armazenamento',
          status: error ? 'degraded' : storageLatency > 5000 ? 'degraded' : 'operational',
          latency: storageLatency,
          icon: Server,
        });
      } catch {
        checks.push({ name: 'Armazenamento', status: 'down', latency: 0, icon: Server });
      }

      // 4. Realtime / API
      const apiStart = performance.now();
      try {
        if (tenantId) {
          const { error } = await supabase.from('ordens_servico').select('id', { count: 'exact', head: true }).eq('empresa_id', tenantId);
          const apiLatency = Math.round(performance.now() - apiStart);
          checks.push({
            name: 'API / Queries',
            status: error ? 'degraded' : apiLatency > 3000 ? 'degraded' : 'operational',
            latency: apiLatency,
            icon: Activity,
          });
        } else {
          checks.push({ name: 'API / Queries', status: 'operational', latency: 0, icon: Activity });
        }
      } catch {
        checks.push({ name: 'API / Queries', status: 'down', latency: 0, icon: Activity });
      }

      const overallStatus = checks.some(c => c.status === 'down')
        ? 'down'
        : checks.some(c => c.status === 'degraded')
          ? 'degraded'
          : 'operational';

      const avgLatency = Math.round(checks.reduce((sum, c) => sum + c.latency, 0) / checks.length);

      return { services: checks, overallStatus, avgLatency, checkedAt: new Date().toISOString() };
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const overall = healthData?.overallStatus ?? 'operational';
  const cfg = STATUS_CONFIG[overall];

  return (
    <div className="module-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Status do Sistema</h1>
          <p className="text-muted-foreground text-sm">
            Monitoramento em tempo real dos serviÃ§os
          </p>
        </div>
        <Badge variant={cfg.badge} className="text-sm px-3 py-1">
          <cfg.icon className="w-4 h-4 mr-1" />
          {cfg.label}
        </Badge>
      </div>

      {/* Overall banner */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${cfg.color} animate-pulse`} />
            <div>
              <p className="font-semibold text-lg">
                {overall === 'operational'
                  ? 'Todos os sistemas operacionais'
                  : overall === 'degraded'
                    ? 'Alguns serviÃ§os apresentam lentidÃ£o'
                    : 'ServiÃ§os com indisponibilidade detectada'}
              </p>
              <p className="text-sm text-muted-foreground">
                LatÃªncia mÃ©dia: {healthData?.avgLatency ?? 0}ms
                {healthData?.checkedAt && (
                  <> â€” Verificado em {new Date(healthData.checkedAt).toLocaleTimeString('pt-BR')}</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          healthData?.services.map((service) => {
            const sCfg = STATUS_CONFIG[service.status];
            const Icon = service.icon;
            return (
              <Card key={service.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="w-5 h-5" />
                    {service.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={sCfg.badge}>
                      <sCfg.icon className="w-3 h-3 mr-1" />
                      {sCfg.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {service.latency}ms
                    </span>
                  </div>
                  <Progress
                    value={service.status === 'operational' ? 100 : service.status === 'degraded' ? 60 : 10}
                    className="h-2"
                  />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Uptime info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5" />
            InformaÃ§Ãµes do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Plataforma</p>
              <p className="font-medium">Supabase Cloud</p>
            </div>
            <div>
              <p className="text-muted-foreground">Frontend</p>
              <p className="font-medium">Cloudflare Pages</p>
            </div>
            <div>
              <p className="text-muted-foreground">RegiÃ£o</p>
              <p className="font-medium">South America (GRU)</p>
            </div>
            <div>
              <p className="text-muted-foreground">VersÃ£o</p>
              <p className="font-medium">v2.0 Enterprise</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
