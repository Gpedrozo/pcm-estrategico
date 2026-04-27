import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { usePendingOrdensServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Search, Wrench, ClipboardCheck } from 'lucide-react';

export default function PortalMecanicoOS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: mecanicos } = useMecanicosAtivos();
  const { data: ordens } = usePendingOrdensServico();

  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [mecanicoIdLogado, setMecanicoIdLogado] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const mecanicoLogado = useMemo(
    () => (mecanicos || []).find((m) => m.id === mecanicoIdLogado) || null,
    [mecanicos, mecanicoIdLogado],
  );

  const ordensFiltradas = useMemo(() => {
    if (!mecanicoLogado) return [];
    const termo = search.trim().toLowerCase();

    return (ordens || []).filter((os) => {
      const assignedById = os.mecanico_responsavel_id === mecanicoLogado.id;
      const assignedByCode = Boolean(mecanicoLogado.codigo_acesso) && os.mecanico_responsavel_codigo === mecanicoLogado.codigo_acesso;
      if (!assignedById && !assignedByCode) return false;

      if (!termo) return true;
      return (
        String(os.numero_os).includes(termo) ||
        (os.tag || '').toLowerCase().includes(termo) ||
        (os.equipamento || '').toLowerCase().includes(termo) ||
        (os.problema || '').toLowerCase().includes(termo)
      );
    });
  }, [mecanicoLogado, ordens, search]);

  const [_validando, setValidando] = useState(false);

  const handleEntrar = async () => {
    const code = codigo.trim().toUpperCase();
    if (!code || !senha.trim()) {
      toast({
        title: 'Dados obrigatórios',
        description: 'Informe código e senha do mecânico.',
        variant: 'destructive',
      });
      return;
    }

    const mecanico = (mecanicos || []).find((m) => (m.codigo_acesso || '').toUpperCase() === code);
    if (!mecanico || !mecanico.ativo) {
      toast({
        title: 'Acesso negado',
        description: 'Código não encontrado ou mecânico inativo.',
        variant: 'destructive',
      });
      return;
    }

    setValidando(true);
    try {
      const { data: senhaValida, error } = await supabase.rpc('verificar_senha_mecanico', {
        p_mecanico_id: mecanico.id,
        p_senha: senha,
      });
      if (error || !senhaValida) {
        toast({
          title: 'Acesso negado',
          description: 'Senha inválida para este código.',
          variant: 'destructive',
        });
        return;
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao validar credenciais.',
        variant: 'destructive',
      });
      return;
    } finally {
      setValidando(false);
    }

    setMecanicoIdLogado(mecanico.id);
    setSearch('');
  };

  if (!mecanicoLogado) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Portal de Fechamento por Mecânico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Código do mecânico</Label>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: MEC-001" />
            </div>
            <div className="space-y-2">
              <Label>Senha de acesso</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha operacional" />
            </div>
            <Button className="w-full" onClick={handleEntrar}>Entrar no portal</Button>
            <p className="text-xs text-muted-foreground">
              Este portal mostra apenas O.S atribuídas ao código informado e direciona para o fechamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portal Mecânico</h1>
          <p className="text-muted-foreground">
            Mecânico: {mecanicoLogado.nome} {mecanicoLogado.codigo_acesso ? `• ${mecanicoLogado.codigo_acesso}` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={() => setMecanicoIdLogado(null)}>Trocar mecânico</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por OS, TAG, equipamento..." />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {ordensFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Wrench className="h-8 w-8 mx-auto mb-2 opacity-60" />
              Nenhuma O.S em aberto para este mecânico.
            </CardContent>
          </Card>
        ) : (
          ordensFiltradas.map((os) => (
            <Card key={os.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">OS #{os.numero_os}</Badge>
                    <Badge>{os.prioridade}</Badge>
                  </div>
                  <p className="font-medium">{os.equipamento} • {os.tag}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{os.problema}</p>
                </div>
                <Button onClick={() => navigate(`/os/fechar?osId=${os.id}&mecanicoId=${mecanicoLogado.id}`)} className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Fechar O.S
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
