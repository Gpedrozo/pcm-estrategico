import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrdensServico, useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkStorageLimit } from '@/lib/storageLimit';
import { useOptionalTenant } from '@/contexts/TenantContext';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Play,
  Pause,
  Camera,
  Clock,
  AlertTriangle,
  Loader2,
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

export default function PortalMecanicoExecucao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tenantCtx = useOptionalTenant();
  const tenantId = tenantCtx?.tenant?.id ?? sessionStorage.getItem('portal_mecanico_empresa_id');
  const { data: ordens } = useOrdensServico();
  const updateOS = useUpdateOrdemServico();

  const os = useMemo(() => (ordens || []).find(o => o.id === id), [ordens, id]);

  const [checklistOk, setChecklistOk] = useState<boolean[]>(CHECKLIST_SEGURANCA.map(() => false));
  const allChecked = checklistOk.every(Boolean);

  const [showDevolver, setShowDevolver] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  const timerKey = `portal_mec_timer_${id}`;
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    try { const v = sessionStorage.getItem(timerKey); return v ? Number(v) : null; } catch { return null; }
  });
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleIniciar = () => {
    if (!os || !allChecked) return;
    updateOS.mutate(
      { id: os.id, status: 'EM_ANDAMENTO' },
      {
        onSuccess: () => {
          const now = Date.now();
          setStartedAt(now);
          try { sessionStorage.setItem(timerKey, String(now)); } catch { /* ignore */ }
          toast({ title: 'Execução iniciada!', description: `OS #${os.numero_os} em andamento.` });
        },
      },
    );
  };

  const handlePausar = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStartedAt(null);
    try { sessionStorage.removeItem(timerKey); } catch { /* ignore */ }
    toast({ title: 'Execução pausada' });
  };

  const handleIrFinalizar = () => {
    if (!os) return;
    navigate(`/portal-mecanico/finalizar/${os.id}`, { state: { fotos, elapsed } });
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
        licoes_aprendidas: `[DEVOLVIDA] ${justificativa.trim()}${os.licoes_aprendidas ? '\n---\n' + os.licoes_aprendidas : ''}`,
      },
      {
        onSuccess: () => {
          try { sessionStorage.removeItem(timerKey); } catch { /* ignore */ }
          toast({ title: 'OS devolvida', description: 'Encaminhada de volta ao planejamento.' });
          navigate('/portal-mecanico');
        },
      },
    );
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId || !os) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
        // Storage limit check
    if (tenantId) {
      const storageCheck = await checkStorageLimit(tenantId, file.size);
      if (!storageCheck.allowed) {
        toast({ title: 'Limite de armazenamento', description: storageCheck.message, variant: 'destructive' });
        return;
      }
    }
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
        <Button variant="outline" className="mt-4 h-14 text-base rounded-2xl" onClick={() => navigate('/portal-mecanico')}>Voltar</Button>
      </div>
    );
  }

  const isEmAndamento = os.status === 'EM_ANDAMENTO';
  const prioColor = PRIO_COLOR[os.prioridade?.toUpperCase()] || 'bg-gray-500';
  const isUrgente = os.prioridade?.toUpperCase() === 'URGENTE' || os.prioridade?.toUpperCase() === 'EMERGENCIA';

  return (
    <div className="space-y-5 py-6 pb-8 md:pt-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/portal-mecanico')}
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

      {/* Info equipamento */}
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

      {/* Cronômetro */}
      {(startedAt || isEmAndamento) && (
        <div className="rounded-2xl bg-orange-500/5 border-2 border-orange-500/20 p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Tempo de execução</p>
          <p className="text-5xl font-mono font-black text-orange-500 tracking-tight">{formatTime(elapsed)}</p>
        </div>
      )}

      {/* Checklist de Segurança */}
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
                  checklistOk[i] ? 'border-green-400 bg-green-500/10' : 'border-border bg-card'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                  checklistOk[i] ? 'bg-green-500' : 'bg-muted'
                )}>
                  {checklistOk[i] ? <Check className="h-5 w-5 text-white" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                </div>
                <span className={cn('text-sm font-medium text-left', checklistOk[i] && 'line-through text-muted-foreground')}>{item}</span>
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
              allChecked ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
            )}
            onClick={handleIniciar}
            disabled={!allChecked || updateOS.isPending}
          >
            {updateOS.isPending ? <Loader2 className="h-8 w-8 animate-spin" /> : <Play className="h-8 w-8" />}
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
                    'py-2.5 rounded-xl border-2 text-sm font-bold transition-all capitalize',
                    fotoFase === fase ? 'border-orange-500 bg-orange-500/10 text-orange-700' : 'border-border bg-card'
                  )}
                >
                  {fase}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 p-5 rounded-2xl border-2 border-dashed bg-card active:bg-muted/50 cursor-pointer transition-colors">
              {uploading
                ? <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                : <Camera className="h-8 w-8 text-orange-500" />
              }
              <div className="flex-1">
                <p className="font-bold text-base">{uploading ? 'Enviando...' : `Tirar Foto (${fotoFase})`}</p>
                <p className="text-sm text-muted-foreground">Toque para capturar ou selecionar imagem</p>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={handleFotoUpload} className="hidden" disabled={uploading} />
            </label>
            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2">
                    <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] text-center py-0.5 capitalize">{f.fase}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões Finalizar / Devolver */}
          <Button
            className="w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 bg-green-600 hover:bg-green-700 shadow-lg"
            onClick={handleIrFinalizar}
          >
            <Flag className="h-7 w-7" />
            FINALIZAR O.S.
          </Button>

          {!showDevolver ? (
            <Button
              variant="outline"
              className="w-full h-14 text-sm font-bold gap-2 rounded-2xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
              onClick={() => setShowDevolver(true)}
            >
              <Undo2 className="h-5 w-5" />
              Devolver O.S.
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-2xl border-2 border-red-300 bg-red-500/5">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Motivo da devolução:</p>
              <Textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                placeholder="Ex: Falta de peça, aguardando material..."
                rows={3}
                className="text-base rounded-xl border-2"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDevolver(false)}>Cancelar</Button>
                <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleDevolver} disabled={updateOS.isPending}>
                  {updateOS.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Devolução'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
