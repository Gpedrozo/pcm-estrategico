import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrdensServico, useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Camera,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  ShieldCheck,
  Square,
  Check,
  Flag,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIO_COLOR: Record<string, string> = {
  URGENTE: 'bg-red-600', EMERGENCIA: 'bg-red-600', ALTA: 'bg-orange-500',
  MEDIA: 'bg-yellow-500', BAIXA: 'bg-green-500',
};

const CHECKLIST_SEGURANCA = [
  'EPI completo (óculos, luvas, capacete)',
  'Máquina bloqueada / LOTO aplicado',
  'Área isolada e sinalizada',
  'Ferramentas inspecionadas',
];

type FotoFase = 'antes' | 'durante';

interface FotoItem {
  url: string;
  name: string;
  fase: FotoFase;
  timestamp: number;
}

export default function MecanicoExecucao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const { data: ordens } = useOrdensServico();
  const updateOS = useUpdateOrdemServico();

  const os = useMemo(() => (ordens || []).find(o => o.id === id), [ordens, id]);

  // Checklist de segurança
  const [checklistOk, setChecklistOk] = useState<boolean[]>(CHECKLIST_SEGURANCA.map(() => false));
  const allChecked = checklistOk.every(Boolean);

  // Devolver OS
  const [showDevolver, setShowDevolver] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  // Cronômetro persistente (survives component remount)
  const timerKey = `mec_timer_${id}`;
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    try {
      const v = sessionStorage.getItem(timerKey);
      return v ? Number(v) : null;
    } catch { return null; }
  });
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fotos por fase
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fotoFase, setFotoFase] = useState<FotoFase>('antes');

  useEffect(() => {
    if (startedAt) {
      const tick = () => setElapsed(Date.now() - startedAt);
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
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
    if (!os || !allChecked) return;
    updateOS.mutate(
      { id: os.id, status: 'EM_ANDAMENTO' },
      {
        onSuccess: () => {
          const now = Date.now();
          setStartedAt(now);
          try { sessionStorage.setItem(timerKey, String(now)); } catch {}
          toast({ title: 'Execução iniciada!', description: `OS #${os.numero_os} em andamento.` });
        },
      },
    );
  };

  const handlePausar = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStartedAt(null);
    try { sessionStorage.removeItem(timerKey); } catch {}
    toast({ title: 'Execução pausada' });
  };

  const handleIrFinalizar = () => {
    if (!os) return;
    navigate(`/mecanico/finalizar/${os.id}`, {
      state: { fotos, elapsed },
    });
  };

  const handleDevolver = () => {
    if (!os || !justificativa.trim()) {
      toast({ title: 'Informe a justificativa', variant: 'destructive' });
      return;
    }
    updateOS.mutate(
      {
        id: os.id,
        status: 'ABERTA',
        observacoes: `[DEVOLVIDA] ${justificativa.trim()}${os.observacoes ? '\n---\n' + os.observacoes : ''}`,
      },
      {
        onSuccess: () => {
          try { sessionStorage.removeItem(timerKey); } catch {}
          toast({ title: 'OS devolvida', description: 'Encaminhada de volta ao planejamento.' });
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
    const path = `os-fotos/${tenantId}/${os.id}/${fotoFase}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('attachments').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      setFotos(prev => [...prev, { url: urlData.publicUrl, name: file.name, fase: fotoFase, timestamp: Date.now() }]);
      toast({ title: 'Foto enviada!' });
    }
    setUploading(false);
    e.target.value = '';
  };

  if (!os) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-bold">O.S. não encontrada</p>
        <Button variant="outline" className="mt-4 h-14 text-base rounded-2xl" onClick={() => navigate('/mecanico')}>Voltar</Button>
      </div>
    );
  }

  const isEmAndamento = os.status === 'EM_ANDAMENTO';
  const prioColor = PRIO_COLOR[os.prioridade?.toUpperCase()] || 'bg-gray-500';
  const isUrgente = os.prioridade?.toUpperCase() === 'URGENTE' || os.prioridade?.toUpperCase() === 'EMERGENCIA';

  return (
    <div className="space-y-5 py-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/mecanico')}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black truncate">OS #{os.numero_os}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn(prioColor, 'text-white text-sm')}>{os.prioridade}</Badge>
            <Badge variant="outline" className="text-sm">{os.status?.replace('_', ' ')}</Badge>
          </div>
        </div>
      </div>

      {/* Info do equipamento */}
      <div className={cn(
        'rounded-2xl border-2 p-4 space-y-2',
        isUrgente ? 'border-red-400 bg-red-500/5' : 'border-border'
      )}>
        <p className="font-bold text-lg">{os.equipamento}</p>
        <p className="text-sm text-muted-foreground">{os.tag}</p>
        <p className="text-base">{os.problema}</p>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Aberta em {new Date(os.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Cronômetro persistente */}
      {(startedAt || isEmAndamento) && (
        <div className="rounded-2xl bg-primary/5 border-2 border-primary/20 p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Tempo de execução</p>
          <p className="text-5xl font-mono font-black text-primary tracking-tight">{formatTime(elapsed)}</p>
        </div>
      )}

      {/* Checklist de Segurança — obrigatório antes de iniciar */}
      {!isEmAndamento && os.status !== 'FECHADA' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-bold">Checklist de Segurança</h3>
          </div>
          <div className="space-y-2">
            {CHECKLIST_SEGURANCA.map((item, i) => (
              <button
                key={i}
                onClick={() => setChecklistOk(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.97]',
                  checklistOk[i]
                    ? 'border-green-400 bg-green-500/10'
                    : 'border-border bg-card'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                  checklistOk[i] ? 'bg-green-500' : 'bg-muted'
                )}>
                  {checklistOk[i] ? <Check className="h-5 w-5 text-white" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                </div>
                <span className={cn(
                  'text-sm font-medium text-left',
                  checklistOk[i] && 'line-through text-muted-foreground'
                )}>{item}</span>
              </button>
            ))}
          </div>
          {!allChecked && (
            <p className="text-sm text-amber-600 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Complete todos os itens de segurança antes de iniciar
            </p>
          )}
          <Button
            className={cn(
              'w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 transition-all shadow-lg',
              allChecked
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
            )}
            onClick={handleIniciar}
            disabled={!allChecked || updateOS.isPending}
          >
            {updateOS.isPending
              ? <Loader2 className="h-8 w-8 animate-spin" />
              : <Play className="h-8 w-8" />
            }
            INICIAR EXECUÇÃO
          </Button>
        </div>
      )}

      {/* Controles durante execução */}
      {isEmAndamento && (
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-16 text-lg font-bold gap-3 rounded-2xl active:scale-95 border-2"
            onClick={handlePausar}
          >
            <Pause className="h-6 w-6" />
            PAUSAR
          </Button>

          {/* Fotos por fase */}
          <div className="space-y-3">
            <h3 className="text-base font-bold">Registro Fotográfico</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['antes', 'durante'] as FotoFase[]).map(fase => (
                <button
                  key={fase}
                  onClick={() => setFotoFase(fase)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all active:scale-95',
                    fotoFase === fase ? 'border-primary bg-primary/10 font-bold' : 'border-border'
                  )}
                >
                  <p className="text-sm font-semibold capitalize">{fase}</p>
                  <p className="text-xs text-muted-foreground">
                    {fotos.filter(f => f.fase === fase).length} foto(s)
                  </p>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 p-5 rounded-2xl border-2 border-dashed bg-card active:bg-muted/50 cursor-pointer transition-colors">
              {uploading
                ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
                : <Camera className="h-8 w-8 text-primary" />
              }
              <div className="flex-1">
                <p className="font-bold text-base">
                  {uploading ? 'Enviando...' : `Tirar Foto (${fotoFase})`}
                </p>
                <p className="text-sm text-muted-foreground">Toque para abrir a câmera</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2">
                    <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-semibold capitalize">
                      {f.fase}
                    </div>
                    <button
                      onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão Finalizar → vai para tela dedicada */}
          <Button
            className="w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 transition-all shadow-lg"
            onClick={handleIrFinalizar}
          >
            <Flag className="h-8 w-8" />
            FINALIZAR O.S.
          </Button>

          {/* Devolver OS */}
          {!showDevolver ? (
            <Button
              variant="outline"
              className="w-full h-14 text-base font-bold gap-2 rounded-2xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
              onClick={() => setShowDevolver(true)}
            >
              <Undo2 className="h-5 w-5" />
              DEVOLVER O.S.
            </Button>
          ) : (
            <div className="rounded-2xl border-2 border-red-300 p-4 space-y-3">
              <p className="text-base font-bold text-red-600 flex items-center gap-2">
                <Undo2 className="h-5 w-5" />
                Justificativa da devolução *
              </p>
              <Textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                placeholder="Ex: Falta peça de reposição, equipamento em uso, precisa de equipe especializada..."
                rows={3}
                className="text-base rounded-2xl border-2"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-14 text-base font-bold rounded-2xl border-2 active:scale-95"
                  onClick={() => { setShowDevolver(false); setJustificativa(''); }}
                >
                  Cancelar
                </Button>
                <Button
                  className="h-14 text-base font-bold rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95"
                  onClick={handleDevolver}
                  disabled={!justificativa.trim() || updateOS.isPending}
                >
                  {updateOS.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OS Fechada */}
      {os.status === 'FECHADA' && (
        <div className="rounded-2xl border-2 border-green-400 bg-green-500/10 p-6 text-center space-y-2">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <p className="text-lg font-black text-green-700 dark:text-green-400">O.S. Finalizada</p>
          <p className="text-sm text-muted-foreground">
            Fechada em {os.data_fechamento ? new Date(os.data_fechamento).toLocaleDateString('pt-BR') : '—'}
          </p>
        </div>
      )}
    </div>
  );
}
