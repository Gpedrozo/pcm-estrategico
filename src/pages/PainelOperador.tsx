import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSolicitacoes } from '@/hooks/useSolicitacoes';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ListTodo,
  History,
  XCircle,
  Hourglass,
  Plus,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE:   { label: 'Pendente',   color: 'bg-amber-100 text-amber-800 border-amber-300',  icon: Hourglass },
  APROVADA:   { label: 'Aprovada',   color: 'bg-blue-100 text-blue-800 border-blue-300',     icon: CheckCircle2 },
  CONVERTIDA: { label: 'Convertida', color: 'bg-green-100 text-green-800 border-green-300',  icon: ArrowRight },
  REJEITADA:  { label: 'Rejeitada',  color: 'bg-red-100 text-red-800 border-red-300',        icon: XCircle },
  CANCELADA:  { label: 'Cancelada',  color: 'bg-muted text-muted-foreground border-border',     icon: XCircle },
};

export default function PainelOperador() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: solicitacoes } = useSolicitacoes();
  const { data: ordens } = useOrdensServico();

  const [searchAtivas, setSearchAtivas] = useState('');
  const [searchHistorico, setSearchHistorico] = useState('');

  const nomeUsuario = user?.nome || '';

  // Filtra solicitações do operador logado (pelo nome do solicitante)
  const minhasSolicitacoes = useMemo(() => {
    if (!nomeUsuario) return solicitacoes || [];
    const nome = nomeUsuario.trim().toLowerCase();
    return (solicitacoes || []).filter((s) =>
      (s.solicitante_nome || '').toLowerCase().includes(nome),
    );
  }, [solicitacoes, nomeUsuario]);

  // Ativas = PENDENTE ou APROVADA (aguardando ação)
  const solicitacoesAtivas = useMemo(() => {
    const termo = searchAtivas.trim().toLowerCase();
    return minhasSolicitacoes
      .filter((s) => s.status === 'PENDENTE' || s.status === 'APROVADA')
      .filter((s) => {
        if (!termo) return true;
        return (
          String(s.numero_solicitacao).includes(termo) ||
          (s.tag || '').toLowerCase().includes(termo) ||
          (s.descricao_falha || '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [minhasSolicitacoes, searchAtivas]);

  // Histórico = CONVERTIDA, REJEITADA, CANCELADA
  const solicitacoesHistorico = useMemo(() => {
    const termo = searchHistorico.trim().toLowerCase();
    return minhasSolicitacoes
      .filter((s) => s.status !== 'PENDENTE' && s.status !== 'APROVADA')
      .filter((s) => {
        if (!termo) return true;
        return (
          String(s.numero_solicitacao).includes(termo) ||
          (s.tag || '').toLowerCase().includes(termo) ||
          (s.descricao_falha || '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [minhasSolicitacoes, searchHistorico]);

  // Mapear os_id → O.S. número
  const osMap = useMemo(() => {
    const m = new Map<string, { numero_os: number; status: string; equipamento: string }>();
    (ordens || []).forEach((os) => m.set(os.id, { numero_os: os.numero_os, status: os.status, equipamento: os.equipamento }));
    return m;
  }, [ordens]);

  // Stats
  const stats = useMemo(() => {
    const pendentes = minhasSolicitacoes.filter((s) => s.status === 'PENDENTE').length;
    const aprovadas = minhasSolicitacoes.filter((s) => s.status === 'APROVADA').length;
    const convertidas = minhasSolicitacoes.filter((s) => s.status === 'CONVERTIDA').length;
    const total = minhasSolicitacoes.length;
    return { pendentes, aprovadas, convertidas, total };
  }, [minhasSolicitacoes]);

  // SLA info
  const getSlaInfo = (s: { sla_horas?: number | null; data_limite?: string | null; created_at: string }) => {
    if (!s.data_limite) return null;
    const limite = new Date(s.data_limite);
    const now = new Date();
    const diffH = Math.round((limite.getTime() - now.getTime()) / 3600000);
    if (diffH < 0) return { label: 'SLA Vencido', color: 'text-red-600 font-semibold' };
    if (diffH < 12) return { label: `${diffH}h restantes`, color: 'text-amber-600' };
    return { label: `${diffH}h restantes`, color: 'text-muted-foreground' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Painel do Operador
          </h1>
          <p className="text-muted-foreground">
            Olá, {nomeUsuario}! Acompanhe suas solicitações e ordens de serviço.
          </p>
        </div>
        <Button onClick={() => navigate('/solicitacoes')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
              <Hourglass className="h-8 w-8 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Aprovadas</p>
                <p className="text-2xl font-bold">{stats.aprovadas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Com O.S. Gerada</p>
                <p className="text-2xl font-bold">{stats.convertidas}</p>
              </div>
              <ArrowRight className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ativas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ativas" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Em Andamento ({solicitacoesAtivas.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico ({solicitacoesHistorico.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Ativas */}
        <TabsContent value="ativas" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchAtivas}
              onChange={(e) => setSearchAtivas(e.target.value)}
              placeholder="Buscar por número, TAG, descrição..."
            />
          </div>

          {solicitacoesAtivas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma solicitação ativa</p>
                <p className="text-sm">Use o botão acima para criar uma nova solicitação.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {solicitacoesAtivas.map((sol) => {
                const cfg = STATUS_CONFIG[sol.status] || STATUS_CONFIG.PENDENTE;
                const StatusIcon = cfg.icon;
                const sla = getSlaInfo(sol);
                const osInfo = sol.os_id ? osMap.get(sol.os_id) : null;

                return (
                  <Card key={sol.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{sol.numero_solicitacao}
                          </Badge>
                          <Badge className={`text-xs border ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                          {sol.classificacao && (
                            <Badge variant="secondary" className="text-xs">
                              {sol.classificacao}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-sm">{sol.tag}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {sol.descricao_falha}
                        </p>
                      </div>

                      {/* Rastreio: se tem O.S. gerada */}
                      {osInfo && (
                        <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded px-2 py-1">
                          <ArrowRight className="h-3 w-3 text-green-600" />
                          <span className="text-green-700 font-medium">
                            O.S. #{osInfo.numero_os} • {osInfo.status?.replace('_', ' ')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {sla && <span className={sla.color}>{sla.label}</span>}
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

          {solicitacoesHistorico.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Sem histórico</p>
                <p className="text-sm">Solicitações finalizadas aparecerão aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-[80px_100px_1fr_1fr_120px_120px] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                <span>Nº</span>
                <span>Status</span>
                <span>TAG</span>
                <span>Descrição</span>
                <span>Data</span>
                <span>O.S.</span>
              </div>
              {solicitacoesHistorico.map((sol) => {
                const cfg = STATUS_CONFIG[sol.status] || STATUS_CONFIG.CANCELADA;
                const osInfo = sol.os_id ? osMap.get(sol.os_id) : null;
                return (
                  <Card key={sol.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="md:grid md:grid-cols-[80px_100px_1fr_1fr_120px_120px] md:gap-3 md:items-center space-y-2 md:space-y-0">
                        <Badge variant="outline" className="font-mono text-xs w-fit">
                          #{sol.numero_solicitacao}
                        </Badge>
                        <Badge className={`text-xs border w-fit ${cfg.color}`}>{cfg.label}</Badge>
                        <p className="font-medium text-sm">{sol.tag}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{sol.descricao_falha}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sol.updated_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs">
                          {osInfo ? (
                            <Badge variant="secondary" className="text-xs">
                              OS #{osInfo.numero_os}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
