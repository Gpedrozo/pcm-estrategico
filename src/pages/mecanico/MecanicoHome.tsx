import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Lock,
  Wrench,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  ListTodo,
  Timer,
  CheckCircle2,
  LogOut,
  Search,
} from 'lucide-react';

/* ─── Prioridade helpers ─── */
const PRIO: Record<string, { color: string; border: string; bg: string; order: number }> = {
  URGENTE:    { color: 'bg-red-500',    border: 'border-red-400',    bg: 'bg-red-50 dark:bg-red-950/30',       order: 0 },
  EMERGENCIA: { color: 'bg-red-500',    border: 'border-red-400',    bg: 'bg-red-50 dark:bg-red-950/30',       order: 0 },
  ALTA:       { color: 'bg-orange-500', border: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', order: 1 },
  MEDIA:      { color: 'bg-yellow-500', border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', order: 2 },
  BAIXA:      { color: 'bg-green-500',  border: 'border-green-400',  bg: 'bg-green-50 dark:bg-green-950/30',   order: 3 },
};
const getPrio = (p: string) => PRIO[p?.toUpperCase()] ?? { color: 'bg-gray-500', border: 'border-gray-300', bg: 'bg-gray-50', order: 9 };

const STATUS_BADGE: Record<string, string> = {
  ABERTA: 'bg-blue-100 text-blue-800 border-blue-300',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-800 border-amber-300',
};

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

  const mecanico = useMemo(() => {
    const m = (mecanicos || []).find(m => m.id === mecanicoId);
    if (!m) return null;
    return { id: m.id, nome: m.nome, codigo_acesso: m.codigo_acesso ?? null, especialidade: m.especialidade ?? null };
  }, [mecanicos, mecanicoId]);

  /* ─── Filtros ─── */
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

  /* ─── Login handler ─── */
  const handleLogin = () => {
    const code = codigo.trim().toUpperCase();
    if (!code || !senha.trim()) {
      toast({ title: 'Dados obrigatórios', description: 'Informe código e senha.', variant: 'destructive' });
      return;
    }
    const m = (mecanicos || []).find(m => (m.codigo_acesso || '').toUpperCase() === code);
    if (!m || !m.ativo) {
      toast({ title: 'Acesso negado', description: 'Código não encontrado ou inativo.', variant: 'destructive' });
      return;
    }
    if ((m.senha_acesso || '') !== senha) {
      toast({ title: 'Acesso negado', description: 'Senha inválida.', variant: 'destructive' });
      return;
    }
    setMecanicoId(m.id);
    try { sessionStorage.setItem('mecanico_logado_id', m.id); } catch {}
  };

  const handleLogout = () => {
    setMecanicoId(null);
    setCodigo('');
    setSenha('');
    try { sessionStorage.removeItem('mecanico_logado_id'); } catch {}
  };

  /* ─── Tela de Login ─── */
  if (!mecanico) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="pt-8 pb-6 px-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Painel do Mecânico</h1>
              <p className="text-sm text-muted-foreground">Acesse com seu código e senha</p>
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Ex: MEC-001"
                autoFocus
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Senha operacional"
                className="h-12 text-base"
              />
            </div>
            <Button className="w-full h-14 text-lg gap-2" onClick={handleLogin}>
              <Lock className="h-5 w-5" />
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Painel Principal ─── */
  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Olá, {mecanico.nome.split(' ')[0]}!
          </h1>
          <p className="text-sm text-muted-foreground">
            {pendentes.length} O.S. pendente{pendentes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-muted active:scale-95" title="Trocar mecânico">
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Urgentes</p>
              <p className="text-2xl font-bold">{urgentes.length}</p>
            </div>
            <AlertTriangle className="h-7 w-7 text-red-500 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Em Andamento</p>
              <p className="text-2xl font-bold">{emAndamento.length}</p>
            </div>
            <Timer className="h-7 w-7 text-amber-500 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Pendentes</p>
              <p className="text-2xl font-bold">{pendentes.length}</p>
            </div>
            <ListTodo className="h-7 w-7 text-blue-500 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Fechadas</p>
              <p className="text-2xl font-bold">
                {minhasOrdens.filter(os => os.status === 'FECHADA').length}
              </p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-green-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Lista de O.S. */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Suas Ordens de Serviço</h2>

        {pendentes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma O.S. pendente</p>
              <p className="text-sm">Tudo em dia! 🎉</p>
            </CardContent>
          </Card>
        ) : (
          pendentes.map(os => {
            const pri = getPrio(os.prioridade);
            return (
              <Card
                key={os.id}
                className={`border-l-4 ${pri.border} ${pri.bg} active:scale-[0.98] transition-all cursor-pointer`}
                onClick={() => navigate(`/mecanico/os/${os.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">OS #{os.numero_os}</Badge>
                    <Badge className={`${pri.color} text-white text-xs`}>{os.prioridade}</Badge>
                    <Badge variant="outline" className={STATUS_BADGE[os.status] || ''}>{os.status?.replace('_', ' ')}</Badge>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{os.equipamento}</p>
                    <p className="text-xs text-muted-foreground">{os.tag}</p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{os.problema}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(os.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <Button
                      size="lg"
                      className="h-12 px-6 text-base font-semibold gap-2 rounded-xl active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/mecanico/os/${os.id}`);
                      }}
                    >
                      <ClipboardCheck className="h-5 w-5" />
                      Executar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
