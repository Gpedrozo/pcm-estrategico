import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useOrdensServico, useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Camera,
  MessageSquare,
  Wrench as WrenchIcon,
  Clock,
  AlertTriangle,
  Loader2,
  ImageIcon,
  X,
} from 'lucide-react';

const PRIO_COLOR: Record<string, string> = {
  URGENTE: 'bg-red-500', EMERGENCIA: 'bg-red-500', ALTA: 'bg-orange-500',
  MEDIA: 'bg-yellow-500', BAIXA: 'bg-green-500',
};

export default function MecanicoExecucao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const { data: ordens } = useOrdensServico();
  const updateOS = useUpdateOrdemServico();

  const os = useMemo(() => (ordens || []).find(o => o.id === id), [ordens, id]);

  // Cronômetro
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drawer states
  const [observacoes, setObservacoes] = useState('');
  const [materiaisUsados, setMateriaisUsados] = useState('');
  const [fotos, setFotos] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Start/stop timer
  useEffect(() => {
    if (startedAt) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startedAt]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  /* ─── Ações ─── */
  const handleIniciar = () => {
    if (!os) return;
    updateOS.mutate(
      { id: os.id, status: 'EM_ANDAMENTO' },
      {
        onSuccess: () => {
          setStartedAt(Date.now());
          toast({ title: 'Execução iniciada', description: `OS #${os.numero_os} em andamento.` });
        },
      },
    );
  };

  const handlePausar = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStartedAt(null);
    toast({ title: 'Execução pausada' });
  };

  const handleFinalizar = () => {
    if (!os) return;
    if (!observacoes.trim()) {
      toast({ title: 'Observação obrigatória', description: 'Descreva o que foi feito.', variant: 'destructive' });
      return;
    }
    updateOS.mutate(
      {
        id: os.id,
        status: 'FECHADA',
        acao_corretiva: observacoes,
        data_fechamento: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast({ title: 'O.S. Finalizada!', description: `OS #${os.numero_os} fechada com sucesso.` });
          navigate('/mecanico');
        },
      },
    );
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId || !os) return;

    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `os-fotos/${tenantId}/${os.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('attachments').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      setFotos(prev => [...prev, { url: urlData.publicUrl, name: file.name }]);
      toast({ title: 'Foto enviada!' });
    }
    setUploading(false);
    e.target.value = '';
  };

  /* ─── Not found ─── */
  if (!os) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">O.S. não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/mecanico')}>Voltar</Button>
      </div>
    );
  }

  const isEmAndamento = os.status === 'EM_ANDAMENTO';
  const prioColor = PRIO_COLOR[os.prioridade?.toUpperCase()] || 'bg-gray-500';

  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/mecanico')} className="p-2 rounded-lg hover:bg-muted active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">OS #{os.numero_os}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`${prioColor} text-white text-xs`}>{os.prioridade}</Badge>
            <Badge variant="outline" className="text-xs">{os.status?.replace('_', ' ')}</Badge>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div>
            <p className="font-semibold">{os.equipamento}</p>
            <p className="text-sm text-muted-foreground">{os.tag}</p>
          </div>
          <p className="text-sm">{os.problema}</p>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Aberta em {new Date(os.created_at).toLocaleDateString('pt-BR')}
          </div>
        </CardContent>
      </Card>

      {/* Cronômetro */}
      {(startedAt || isEmAndamento) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">Tempo de execução</p>
            <p className="text-3xl font-mono font-bold text-primary">{formatTime(elapsed)}</p>
          </CardContent>
        </Card>
      )}

      {/* Botão principal */}
      {!isEmAndamento && os.status !== 'FECHADA' && (
        <Button
          className="w-full h-16 text-lg font-bold gap-3 rounded-xl active:scale-95 bg-green-600 hover:bg-green-700"
          onClick={handleIniciar}
          disabled={updateOS.isPending}
        >
          {updateOS.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6" />}
          INICIAR EXECUÇÃO
        </Button>
      )}

      {isEmAndamento && (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-14 text-base font-semibold gap-2 rounded-xl active:scale-95"
            onClick={handlePausar}
          >
            <Pause className="h-5 w-5" />
            Pausar
          </Button>
        </div>
      )}

      {/* Ações */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Ações</h3>

        {/* Foto */}
        <label className="flex items-center gap-3 p-4 rounded-xl border bg-card active:bg-muted/50 cursor-pointer transition-colors">
          <Camera className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Tirar Foto</p>
            <p className="text-xs text-muted-foreground">
              {uploading ? 'Enviando...' : `${fotos.length} foto(s) anexada(s)`}
            </p>
          </div>
          {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFotoUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>

        {/* Fotos Grid */}
        {fotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border">
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Observações Drawer */}
        <Drawer>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-3 p-4 rounded-xl border bg-card active:bg-muted/50 w-full text-left transition-colors">
              <MessageSquare className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Observações</p>
                <p className="text-xs text-muted-foreground">
                  {observacoes ? observacoes.slice(0, 40) + '...' : 'Descreva o que foi feito'}
                </p>
              </div>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Observações da Execução</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <Textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Descreva o serviço realizado, peças trocadas, condições encontradas..."
                rows={6}
                className="text-base"
              />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button className="h-12 text-base">Salvar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Materiais Drawer */}
        <Drawer>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-3 p-4 rounded-xl border bg-card active:bg-muted/50 w-full text-left transition-colors">
              <WrenchIcon className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Materiais Usados</p>
                <p className="text-xs text-muted-foreground">
                  {materiaisUsados ? materiaisUsados.slice(0, 40) + '...' : 'Registre os materiais'}
                </p>
              </div>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Materiais Utilizados</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <Textarea
                value={materiaisUsados}
                onChange={e => setMateriaisUsados(e.target.value)}
                placeholder="Ex: Rolamento 6205, Correia B-45, Graxa EP..."
                rows={5}
                className="text-base"
              />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button className="h-12 text-base">Salvar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Botão Finalizar */}
      {(isEmAndamento || startedAt) && (
        <Button
          className="w-full h-16 text-lg font-bold gap-3 rounded-xl active:scale-95"
          onClick={handleFinalizar}
          disabled={updateOS.isPending}
        >
          {updateOS.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
          FINALIZAR O.S.
        </Button>
      )}

      {os.status === 'FECHADA' && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-800 dark:text-green-300">O.S. Finalizada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fechada em {os.data_fechamento ? new Date(os.data_fechamento).toLocaleDateString('pt-BR') : '—'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
