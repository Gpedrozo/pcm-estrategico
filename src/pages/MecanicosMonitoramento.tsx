import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  Activity,
  MapPin,
  Clock,
  Smartphone,
  AlertTriangle,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MecanicoOnline {
  session_id: string;
  mecanico_id: string;
  mecanico_nome: string;
  codigo_acesso: string;
  especialidade: string | null;
  empresa_id: string;
  empresa_nome: string;
  dispositivo_id: string;
  device_name: string | null;
  device_os: string | null;
  login_em: string;
  tempo_decorrido: string;
  minutos_conectado: number;
  ip_address: string | null;
  status: string;
  os_atual_numero: number | null;
  os_equipamento_id: string | null;
}

export default function MecanicosMonitoramento() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [mecanicos, setMecanicos] = useState<MecanicoOnline[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Carregar mec├ónicos online
  const carregarMecanicosOnline = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('v_mecanicos_online_agora')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('login_em', { ascending: false });

      if (error) throw error;
      setMecanicos((data as MecanicoOnline[]) || []);
    } catch (e) {
      logger.error('Erro ao carregar mecânicos:', { error: (e as Error).message });
      toast({
        title: 'Erro',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    carregarMecanicosOnline();

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      carregarMecanicosOnline();
    }, 10000); // Atualiza a cada 10 segundos

    return () => clearInterval(interval);
  }, [carregarMecanicosOnline, autoRefresh]);

  const mecanicosFiltered = mecanicos.filter(m =>
    m.mecanico_nome.toLowerCase().includes(filtro.toLowerCase()) ||
    m.codigo_acesso.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Monitoramento de Mec├ónicos</h1>
        <p className="text-muted-foreground">
          {mecanicos.length} mec├ónico{mecanicos.length !== 1 ? 's' : ''} online agora
        </p>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por nome ou c├│digo..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                icon={<Filter className="h-4 w-4" />}
              />
            </div>
            <Button
              onClick={carregarMecanicosOnline}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Agora
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              {autoRefresh ? 'Parado' : 'Pausado'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold text-primary">{mecanicos.length}</p>
              <p className="text-sm text-muted-foreground">Mec├ónicos Online</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold text-green-600">
                {mecanicos.filter(m => m.os_atual_numero).length}
              </p>
              <p className="text-sm text-muted-foreground">Em Execu├º├úo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold text-amber-600">
                {mecanicos.filter(m => m.minutos_conectado > 120).length}
              </p>
              <p className="text-sm text-muted-foreground">H├í mais de 2h</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold text-blue-600">
                {Math.round(
                  mecanicos.reduce((acc, m) => acc + m.minutos_conectado, 0) / mecanicos.length || 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Tempo M├®dio (min)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Mec├ónicos */}
      <div className="space-y-4">
        {mecanicosFiltered.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum mec├ónico online no momento</p>
            </CardContent>
          </Card>
        ) : (
          mecanicosFiltered.map((mecanico) => (
            <Card key={mecanico.session_id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Coluna 1: Mec├ónico */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-5 w-5 text-primary animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{mecanico.mecanico_nome}</p>
                        <p className="text-xs text-muted-foreground">{mecanico.codigo_acesso}</p>
                        {mecanico.especialidade && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {mecanico.especialidade}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Dispositivo */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Smartphone className="h-4 w-4" />
                      Dispositivo
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-mono">{mecanico.device_name || 'Dispositivo'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{mecanico.device_id}</p>
                    </div>
                  </div>

                  {/* Coluna 3: Tempo Conectado */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Conectado h├í
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-primary">
                        {formatarTempo(mecanico.minutos_conectado)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mecanico.login_em).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Coluna 4: OS Atual */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      O.S. Atual
                    </p>
                    {mecanico.os_atual_numero ? (
                      <div className="space-y-1">
                        <Badge className="bg-green-600 text-white">
                          OS #{mecanico.os_atual_numero}
                        </Badge>
                        <p className="text-xs text-muted-foreground">Em Execu├º├úo</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">ÔÇö</p>
                        <p className="text-xs text-muted-foreground">Ocioso</p>
                      </div>
                    )}
                  </div>

                  {/* Coluna 5: IP (se dispon├¡vel) */}
                  {mecanico.ip_address && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        IP
                      </p>
                      <p className="text-sm font-mono text-muted-foreground">{mecanico.ip_address}</p>
                    </div>
                  )}

                  {/* Alerta se muito tempo desconectado */}
                  {mecanico.minutos_conectado > 120 && mecanico.status === 'ATIVO' && (
                    <div className="space-y-2">
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        Alerta: Muito tempo online
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function formatarTempo(minutos: number): string {
  if (minutos < 60) return `${Math.round(minutos)}m`;
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return `${horas}h ${mins}m`;
}
