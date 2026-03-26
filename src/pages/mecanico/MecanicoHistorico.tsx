import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import {
  Search,
  History,
  CheckCircle2,
  Clock,
  Wrench,
} from 'lucide-react';

export default function MecanicoHistorico() {
  const navigate = useNavigate();
  const { data: mecanicos } = useMecanicosAtivos();
  const { data: todasOrdens } = useOrdensServico();
  const [search, setSearch] = useState('');

  const mecanicoId = useMemo(() => {
    try { return sessionStorage.getItem('mecanico_logado_id'); } catch { return null; }
  }, []);

  const mecanico = useMemo(() => {
    if (!mecanicoId) return null;
    return (mecanicos || []).find(m => m.id === mecanicoId) ?? null;
  }, [mecanicos, mecanicoId]);

  const minhasOrdens = useMemo(() => {
    if (!mecanico) return [];
    return (todasOrdens || []).filter(os =>
      os.mecanico_responsavel_id === mecanico.id ||
      (mecanico.codigo_acesso && os.mecanico_responsavel_codigo === mecanico.codigo_acesso)
    );
  }, [mecanico, todasOrdens]);

  const ordensFechadas = useMemo(() => {
    const t = search.trim().toLowerCase();
    return minhasOrdens
      .filter(os => os.status === 'FECHADA')
      .filter(os => {
        if (!t) return true;
        return (
          String(os.numero_os).includes(t) ||
          (os.tag || '').toLowerCase().includes(t) ||
          (os.equipamento || '').toLowerCase().includes(t) ||
          (os.problema || '').toLowerCase().includes(t)
        );
      })
      .sort((a, b) =>
        new Date(b.data_fechamento || b.updated_at).getTime() -
        new Date(a.data_fechamento || a.updated_at).getTime()
      );
  }, [minhasOrdens, search]);

  const ordensPendentes = useMemo(() =>
    minhasOrdens.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA'),
    [minhasOrdens]
  );

  if (!mecanico) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Faça login no painel primeiro</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de O.S.
        </h1>
        <p className="text-sm text-muted-foreground">
          {mecanico.nome} · {ordensFechadas.length} fechada{ordensFechadas.length !== 1 ? 's' : ''} · {ordensPendentes.length} pendente{ordensPendentes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por OS, TAG, equipamento..."
          className="pl-9 h-12 text-base"
        />
      </div>

      {/* Lista */}
      {ordensFechadas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sem histórico</p>
            <p className="text-sm">Nenhuma O.S. fechada encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ordensFechadas.map(os => (
            <Card
              key={os.id}
              className="active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => navigate(`/mecanico/os/${os.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">#{os.numero_os}</Badge>
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">FECHADA</Badge>
                    </div>
                    <p className="font-medium text-sm truncate">{os.equipamento}</p>
                    <p className="text-xs text-muted-foreground truncate">{os.tag}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{os.problema}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {os.data_fechamento
                        ? new Date(os.data_fechamento).toLocaleDateString('pt-BR')
                        : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{os.tipo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
