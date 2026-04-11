import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { getDeviceConfig } from '@/lib/offlineSync';
import {
  useMecanicoLogin,
  useMecanicoLogout,
  useMecanicoValidarCredenciais,
} from '@/hooks/useMecanicoSessionTracking';
import {
  Lock,
  Wrench,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Timer,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Zap,
  Activity,
  Search,
  Calendar,
  Plus,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Prioridade helpers ─── */
const PRIO: Record<string, { color: string; border: string; bg: string; order: number; pulse: boolean }> = {
  URGENTE:    { color: 'bg-red-600',    border: 'border-red-500',    bg: 'bg-red-500/10',    order: 0, pulse: true },
  EMERGENCIA: { color: 'bg-red-600',    border: 'border-red-500',    bg: 'bg-red-500/10',    order: 0, pulse: true },
  ALTA:       { color: 'bg-orange-500', border: 'border-orange-400', bg: 'bg-orange-500/10', order: 1, pulse: false },
  MEDIA:      { color: 'bg-yellow-500', border: 'border-yellow-400', bg: 'bg-yellow-500/10', order: 2, pulse: false },
  BAIXA:      { color: 'bg-green-500',  border: 'border-green-400',  bg: 'bg-green-500/10',  order: 3, pulse: false },
};
const getPrio = (p: string) => PRIO[p?.toUpperCase()] ?? { color: 'bg-gray-500', border: 'border-gray-300', bg: 'bg-gray-500/10', order: 9, pulse: false };

export default function MecanicoHome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: mecanicos } = useMecanicosAtivos();
  const { data: todasOrdens } = useOrdensServico();

  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [mecanicoId, setMecanicoId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('mecanico_logado_id'); } catch { return null; }
  });
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('mecanico_session_id'); } catch { return null; }
  });
  const [loggingIn, setLoggingIn] = useState(false);

  // Hooks para tracking
  const validarCredenciais = useMecanicoValidarCredenciais();
  const registrarLogin = useMecanicoLogin();
  const registrarLogout = useMecanicoLogout();

  // Ref para garantir logout ao desmontar
  const currentSessionIdRef = useRef(sessionId);

  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  // Cleanup ao desmontar: fazer logout se necessário
  useEffect(() => {
    return () => {
      if (currentSessionIdRef.current) {
        // Tentativa de logout ao desmontar (best effort)
        registrarLogout.mutate({
          session_id: currentSessionIdRef.current,
          motivo: 'Desmontagem de componente',
        });
      }
    };
  }, []);

  const mecanico = useMemo(() => {
    const m = (mecanicos || []).find(m => m.id === mecanicoId);
    if (!m) return null;
    return { id: m.id, nome: m.nome, codigo_acesso: m.codigo_acesso ?? null, especialidade: m.especialidade ?? null };
  }, [mecanicos, mecanicoId]);

  const minhasOrdens = useMemo(() => {
    if (!mecanico) return [];
    return (todasOrdens || []).filter(os =>
      os.mecanico_responsavel_id === mecanico.id ||
      (mecanico.codigo_acesso && os.mecanico_responsavel_codigo === mecanico.codigo_acesso)
    );
  }, [mecanico, todasOrdens]);

  const pendentes = useMemo(() =>
    minhasOrdens
      .filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA')
      .sort((a, b) => getPrio(a.prioridade).order - getPrio(b.prioridade).order),
    [minhasOrdens]
  );

  const urgentes = pendentes.filter(os => {
    const p = os.prioridade?.toUpperCase();
    return p === 'URGENTE' || p === 'EMERGENCIA';
  });
  const emAndamento = pendentes.filter(os => os.status === 'EM_ANDAMENTO');

  // Nova função: handleLogin com validação no servidor
  const handleLogin = async () => {
    const code = codigo.trim().toUpperCase();
    if (!code || !senha.trim()) {
      toast({ title: 'Dados obrigatórios', description: 'Informe código e senha.', variant: 'destructive' });
      return;
    }

    setLoggingIn(true);

    try {
      // Obter config do dispositivo (já vinculado via QR)
      const deviceToken = await getDeviceConfig('device_token') as string | null;
      const empresaId = await getDeviceConfig('empresa_id') as string | null;
      const dispositivoId = await getDeviceConfig('dispositivo_id') as string | null;

      if (!deviceToken || !empresaId) {
        toast({
          title: 'Dispositivo não vinculado',
          description: 'Reabra o aplicativo e escaneie o QR Code novamente.',
          variant: 'destructive',
        });
        setLoggingIn(false);
        return;
      }

      // dispositivoId pode ser null em devices vinculados antes da migração.
      // Nesse caso, usamos o device_token como fallback identifier.
      const effectiveDispositivoId = dispositivoId || deviceToken;

      // 1. Validar credenciais NO SERVIDOR (FASE 2)
      validarCredenciais.mutate(
        {
          empresa_id: empresaId,
          dispositivo_id: effectiveDispositivoId,
          codigo_acesso: code,
          senha_acesso: senha,
        },
        {
          onSuccess: (result) => {
            if (!result.ok) {
              toast({
                title: `Erro: ${result.resultado}`,
                description: result.motivo || 'Falha na validação',
                variant: 'destructive',
              });
              
              // Mostrar tentativas restantes se houver
              if (result.tentativas !== undefined && result.tentativas > 0) {
                toast({
                  title: 'Aviso',
                  description: `${5 - result.tentativas} tentativa(s) restante(s) antes de bloqueio`,
                  variant: 'default',
                });
              }
              setLoggingIn(false);
              return;
            }

            const mecanicoId = result.mecanico_id || '';

            // 2. Se validado, registrar login (FASE 1)
            registrarLogin.mutate(
              {
                empresa_id: empresaId,
                dispositivo_id: effectiveDispositivoId,
                mecanico_id: mecanicoId,
                device_token: deviceToken,
                codigo_acesso: code,
              },
              {
                onSuccess: (loginResult) => {
                  // Salvar session ID no sessionStorage
                  try {
                    sessionStorage.setItem('mecanico_logado_id', mecanicoId);
                    sessionStorage.setItem('mecanico_logado_nome', result.mecanico_nome || '');
                    sessionStorage.setItem('mecanico_session_id', loginResult.session_id);
                    sessionStorage.setItem('mecanico_session_inicio', loginResult.login_em);
                  } catch { /* sessionStorage unavailable */ }

                  setMecanicoId(mecanicoId);
                  setSessionId(loginResult.session_id);
                  currentSessionIdRef.current = loginResult.session_id;
                  setCodigo('');
                  setSenha('');
                  setLoggingIn(false);

                  toast({
                    title: 'Login realizado',
                    description: `Bem-vindo, ${result.mecanico_nome}!`,
                  });
                },
                onError: (e: Error) => {
                  toast({
                    title: 'Erro ao registrar login',
                    description: e.message,
                    variant: 'destructive',
                  });
                  setLoggingIn(false);
                },
              }
            );
          },
          onError: (e: Error) => {
            toast({
              title: 'Erro na validação',
              description: e.message,
              variant: 'destructive',
            });
            setLoggingIn(false);
          },
        }
      );
    } catch (e) {
      toast({
        title: 'Erro',
        description: (e as Error).message || 'Falha ao processar login',
        variant: 'destructive',
      });
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    // 1. Registrar logout no servidor (FASE 1)
    if (sessionId) {
      registrarLogout.mutate({
        session_id: sessionId,
        motivo: 'Logout manual (troca de mecânico)',
      });
    }

    // 2. Limpar estado local
    setMecanicoId(null);
    setSessionId(null);
    setCodigo('');
    setSenha('');
    try {
      sessionStorage.removeItem('mecanico_logado_id');
      sessionStorage.removeItem('mecanico_logado_nome');
      sessionStorage.removeItem('mecanico_session_id');
      sessionStorage.removeItem('mecanico_session_inicio');
    } catch {}
  };

  /* ─── Tela de Login (inputs enormes para mãos sujas) ─── */
  if (!mecanico) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg">
              <Wrench className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Painel do Mecânico</h1>
            <p className="text-base text-muted-foreground">Digite seu código e senha</p>
          </div>
          <div className="space-y-4">
            <Input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="CÓDIGO (ex: MEC-001)"
              autoFocus
              className="h-16 text-xl font-mono text-center tracking-widest rounded-2xl border-2 focus:border-primary"
            />
            <Input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="SENHA"
              className="h-16 text-xl text-center tracking-widest rounded-2xl border-2 focus:border-primary"
            />
          </div>
          <Button
            disabled={loggingIn || validarCredenciais.isPending || registrarLogin.isPending}
            className="w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            onClick={handleLogin}
          >
            {loggingIn || validarCredenciais.isPending || registrarLogin.isPending ? (
              <>
                <div className="animate-spin h-7 w-7 border-3 border-primary-foreground border-transparent border-r-primary-foreground rounded-full" />
                AUTENTICANDO...
              </>
            ) : (
              <>
                <Lock className="h-7 w-7" />
                ENTRAR
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Painel Principal ─── */
  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Olá, {mecanico.nome.split(' ')[0]}!
          </h1>
          <p className="text-base text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            {pendentes.length} O.S. pendente{pendentes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-2xl border-2 border-muted hover:bg-muted active:scale-90 transition-all"
          title="Trocar mecânico"
        >
          <LogOut className="h-6 w-6 text-muted-foreground" />
        </button>
      </div>

      {/* Stats Cards — gradientes coloridos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Urgentes', value: urgentes.length, icon: AlertTriangle, gradient: 'from-red-500 to-red-600', pulse: urgentes.length > 0 },
          { label: 'Em Andamento', value: emAndamento.length, icon: Timer, gradient: 'from-amber-500 to-amber-600', pulse: false },
          { label: 'Pendentes', value: pendentes.length, icon: ClipboardCheck, gradient: 'from-blue-500 to-blue-600', pulse: false },
          { label: 'Concluídas', value: minhasOrdens.filter(os => os.status === 'FECHADA').length, icon: CheckCircle2, gradient: 'from-green-500 to-green-600', pulse: false },
        ].map(stat => (
          <div
            key={stat.label}
            className={cn(
              'relative rounded-2xl p-4 bg-gradient-to-br text-white shadow-lg min-h-[100px] flex flex-col justify-between',
              stat.gradient,
              stat.pulse && 'animate-pulse'
            )}
          >
            <stat.icon className="h-8 w-8 opacity-80" />
            <div>
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="text-sm font-medium opacity-90">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta urgente com pulse */}
      {urgentes.length > 0 && (
        <div className="rounded-2xl bg-red-500/10 border-2 border-red-500/30 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-red-700 dark:text-red-400">
              {urgentes.length} O.S. URGENTE{urgentes.length !== 1 ? 'S' : ''}
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">Requer atenção imediata</p>
          </div>
        </div>
      )}

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Equipamento', icon: Search, to: '/mecanico/equipamento' },
          { label: 'Preventivas', icon: Calendar, to: '/mecanico/preventivas' },
          { label: 'Solicitar', icon: Plus, to: '/mecanico/solicitar' },
          { label: 'Manuais', icon: BookOpen, to: '/manuais-operacao' },
        ].map(a => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 border-border bg-card hover:bg-muted active:scale-95 transition-all"
          >
            <a.icon className="h-6 w-6 text-primary" />
            <span className="text-xs font-bold">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Lista de O.S. */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Suas Ordens de Serviço</h2>

        {pendentes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold">Tudo em dia!</p>
            <p className="text-base">Nenhuma O.S. pendente</p>
          </div>
        ) : (
          pendentes.map(os => {
            const pri = getPrio(os.prioridade);
            return (
              <button
                key={os.id}
                onClick={() => navigate(`/mecanico/os/${os.id}`)}
                className={cn(
                  'w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.97]',
                  pri.border, pri.bg,
                  pri.pulse && 'ring-2 ring-red-400/50 ring-offset-2'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-sm px-2 py-0.5">
                        OS #{os.numero_os}
                      </Badge>
                      <Badge className={cn(pri.color, 'text-white text-sm')}>
                        {os.prioridade}
                      </Badge>
                      {os.status === 'EM_ANDAMENTO' && (
                        <Badge className="bg-amber-500 text-white text-sm animate-pulse">
                          EM ANDAMENTO
                        </Badge>
                      )}
                    </div>
                    <p className="font-bold text-base">{os.equipamento}</p>
                    <p className="text-sm text-muted-foreground">{os.tag}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{os.problema}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(os.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-md">
                    <ChevronRight className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
