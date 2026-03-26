import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import {
  Lock,
  Search,
  Wrench,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  History,
  BarChart3,
  LogOut,
  Timer,
  MessageSquare,
  FilePlus,
} from 'lucide-react';

type MecanicoLogado = {
  id: string;
  nome: string;
  codigo_acesso: string | null;
  especialidade: string | null;
  custo_hora: number | null;
};

const PRIORIDADE_CONFIG: Record<string, { color: string; border: string; bg: string; order: number }> = {
  URGENTE:    { color: 'bg-red-500',    border: 'border-red-400',    bg: 'bg-red-50',    order: 0 },
  EMERGENCIA: { color: 'bg-red-500',    border: 'border-red-400',    bg: 'bg-red-50',    order: 0 },
  ALTA:       { color: 'bg-orange-500', border: 'border-orange-400', bg: 'bg-orange-50', order: 1 },
  MEDIA:      { color: 'bg-yellow-500', border: 'border-yellow-400', bg: 'bg-yellow-50', order: 2 },
  BAIXA:      { color: 'bg-green-500',  border: 'border-green-400',  bg: 'bg-green-50',  order: 3 },
};

function getPrioridade(p: string) {
  return PRIORIDADE_CONFIG[p?.toUpperCase()] ?? { color: 'bg-gray-500', border: 'border-gray-300', bg: 'bg-gray-50', order: 9 };
}

const STATUS_BADGE: Record<string, string> = {
  ABERTA: 'bg-blue-100 text-blue-800 border-blue-300',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-800 border-amber-300',
  FECHADA: 'bg-green-100 text-green-800 border-green-300',
  CANCELADA: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function PainelMecanico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: mecanicos } = useMecanicosAtivos();
  const { data: todasOrdens } = useOrdensServico();

  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [mecanicoIdLogado, setMecanicoIdLogado] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchHistorico, setSearchHistorico] = useState('');

  const mecanicoLogado: MecanicoLogado | null = useMemo(
    () => {
      const m = (mecanicos || []).find((m) => m.id === mecanicoIdLogado);
      if (!m) return null;
      return { id: m.id, nome: m.nome, codigo_acesso: m.codigo_acesso ?? null, especialidade: m.especialidade ?? null, custo_hora: m.custo_hora ?? null };
    },
    [mecanicos, mecanicoIdLogado],
  );

  // Filtra O.S. do mecânico logado
  const minhasOrdens = useMemo(() => {
    if (!mecanicoLogado) return [];
    return (todasOrdens || []).filter((os) => {
      return os.mecanico_responsavel_id === mecanicoLogado.id ||
        (mecanicoLogado.codigo_acesso && os.mecanico_responsavel_codigo === mecanicoLogado.codigo_acesso);
    });
  }, [mecanicoLogado, todasOrdens]);

  // Separação: pendentes (não-FECHADA, não-CANCELADA) e histórico (FECHADA)
  const ordensPendentes = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return minhasOrdens
      .filter((os) => os.status !== 'FECHADA' && os.status !== 'CANCELADA')
      .filter((os) => {
        if (!termo) return true;
        return (
          String(os.numero_os).includes(termo) ||
          (os.tag || '').toLowerCase().includes(termo) ||
          (os.equipamento || '').toLowerCase().includes(termo) ||
          (os.problema || '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        const pa = getPrioridade(a.prioridade).order;
        const pb = getPrioridade(b.prioridade).order;
        return pa - pb;
      });
  }, [minhasOrdens, search]);

  const ordensFechadas = useMemo(() => {
    const termo = searchHistorico.trim().toLowerCase();
    return minhasOrdens
      .filter((os) => os.status === 'FECHADA')
      .filter((os) => {
        if (!termo) return true;
        return (
          String(os.numero_os).includes(termo) ||
          (os.tag || '').toLowerCase().includes(termo) ||
          (os.equipamento || '').toLowerCase().includes(termo) ||
          (os.problema || '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => new Date(b.data_fechamento || b.updated_at).getTime() - new Date(a.data_fechamento || a.updated_at).getTime());
  }, [minhasOrdens, searchHistorico]);

  // Stats
  const stats = useMemo(() => {
    const pendentes = minhasOrdens.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA');
    const emAndamento = minhasOrdens.filter(os => os.status === 'EM_ANDAMENTO');
    const fechadasMes = minhasOrdens.filter(os => {
      if (os.status !== 'FECHADA') return false;
      const d = new Date(os.data_fechamento || os.updated_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const urgentes = pendentes.filter(os => {
      const p = os.prioridade?.toUpperCase();
      return p === 'URGENTE' || p === 'EMERGENCIA';
    });
    return {
      pendentes: pendentes.length,
      emAndamento: emAndamento.length,
      fechadasMes: fechadasMes.length,
      urgentes: urgentes.length,
    };
  }, [minhasOrdens]);

  const handleEntrar = () => {
    const code = codigo.trim().toUpperCase();
    if (!code || !senha.trim()) {
      toast({ title: 'Dados obrigatórios', description: 'Informe código e senha do mecânico.', variant: 'destructive' });
      return;
    }

    const mecanico = (mecanicos || []).find((m) => (m.codigo_acesso || '').toUpperCase() === code);
    if (!mecanico || !mecanico.ativo) {
      toast({ title: 'Acesso negado', description: 'Código não encontrado ou mecânico inativo.', variant: 'destructive' });
      return;
    }

    if ((mecanico.senha_acesso || '') !== senha) {
      toast({ title: 'Acesso negado', description: 'Senha inválida para este código.', variant: 'destructive' });
      return;
    }

    setMecanicoIdLogado(mecanico.id);
    setSearch('');
    setSearchHistorico('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEntrar();
  };

  // ─── Tela de Login ─────────────────────────────────
  if (!mecanicoLogado) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Wrench className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Painel do Mecânico</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acesse com seu código e senha para ver suas O.S., executar e acompanhar seu histórico.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Código do mecânico</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ex: MEC-001"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Senha de acesso</Label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Senha operacional"
              />
            </div>
            <Button className="w-full gap-2" onClick={handleEntrar}>
              <Lock className="h-4 w-4" />
              Entrar no Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Painel Principal ─────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Painel do Mecânico
          </h1>
          <p className="text-muted-foreground">
            {mecanicoLogado.nome}
            {mecanicoLogado.codigo_acesso ? ` • ${mecanicoLogado.codigo_acesso}` : ''}
            {mecanicoLogado.especialidade ? ` • ${mecanicoLogado.especialidade}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMecanicoIdLogado(null);
            setCodigo('');
            setSenha('');
          }}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Trocar mecânico
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">O.S. Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
              <ListTodo className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Em Andamento</p>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
              </div>
              <Timer className="h-8 w-8 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Urgentes</p>
                <p className="text-2xl font-bold">{stats.urgentes}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Fechadas no Mês</p>
                <p className="text-2xl font-bold">{stats.fechadasMes}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/solicitacoes')} variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Nova Solicitação
        </Button>
        <Button onClick={() => navigate('/os/nova')} variant="outline" className="gap-2">
          <FilePlus className="h-4 w-4" />
          Emitir O.S.
        </Button>
        <Button onClick={() => navigate('/os/historico')} variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          Ver Todas as O.S.
        </Button>
      </div>

      {/* Tabs: Minhas O.S. / Histórico */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Minhas O.S. ({stats.pendentes})
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico ({ordensFechadas.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Minhas O.S. */}
        <TabsContent value="pendentes" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por OS, TAG, equipamento..."
            />
          </div>

          {ordensPendentes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma O.S. pendente</p>
                <p className="text-sm">Todas as ordens de serviço foram concluídas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {ordensPendentes.map((os) => {
                const pri = getPrioridade(os.prioridade);
                return (
                  <Card key={os.id} className={`border-l-4 ${pri.border} ${pri.bg} transition-all hover:shadow-md`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            OS #{os.numero_os}
                          </Badge>
                          <Badge className={`${pri.color} text-white text-xs`}>
                            {os.prioridade}
                          </Badge>
                          <Badge variant="outline" className={STATUS_BADGE[os.status] || ''}>
                            {os.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{os.equipamento}</p>
                        <p className="text-xs text-muted-foreground">{os.tag}</p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{os.problema}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(os.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/os/fechar?osId=${os.id}&mecanicoId=${mecanicoLogado.id}`)}
                          className="gap-1.5"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          Executar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchHistorico}
              onChange={(e) => setSearchHistorico(e.target.value)}
              placeholder="Buscar no histórico..."
            />
          </div>

          {ordensFechadas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Sem histórico</p>
                <p className="text-sm">Nenhuma O.S. fechada por este mecânico ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[80px_1fr_1fr_120px_120px] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                <span>Nº O.S.</span>
                <span>Equipamento</span>
                <span>Problema</span>
                <span>Fechamento</span>
                <span>Tipo</span>
              </div>
              {ordensFechadas.map((os) => (
                <Card key={os.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="md:grid md:grid-cols-[80px_1fr_1fr_120px_120px] md:gap-3 md:items-center space-y-2 md:space-y-0">
                      <Badge variant="outline" className="font-mono text-xs w-fit">
                        #{os.numero_os}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{os.equipamento}</p>
                        <p className="text-xs text-muted-foreground">{os.tag}</p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{os.problema}</p>
                      <span className="text-xs text-muted-foreground">
                        {os.data_fechamento
                          ? new Date(os.data_fechamento).toLocaleDateString('pt-BR')
                          : new Date(os.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                      <Badge variant="secondary" className="text-xs w-fit">
                        {os.tipo}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
