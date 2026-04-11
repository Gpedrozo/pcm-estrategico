import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOrdensServico, useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  CheckCircle2,
  Camera,
  Loader2,
  X,
  MessageSquare,
  Package,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CHIPS_ACAO = [
  'Troca de peça',
  'Ajuste mecânico',
  'Limpeza',
  'Lubrificação',
  'Alinhamento',
  'Soldagem',
  'Calibração',
  'Reparo elétrico',
];

const CHIPS_MATERIAIS = [
  'Rolamento',
  'Correia',
  'Parafuso',
  'Graxa',
  'Óleo',
  'Vedação',
  'Filtro',
  'Mangueira',
];

interface FotoItem {
  url: string;
  name: string;
  fase: string;
  timestamp: number;
}

export default function MecanicoFinalizar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const { data: ordens } = useOrdensServico();
  const updateOS = useUpdateOrdemServico();

  const os = (ordens || []).find(o => o.id === id);
  const state = location.state as { fotos?: FotoItem[]; elapsed?: number } | null;

  const [observacoes, setObservacoes] = useState('');
  const [materiaisUsados, setMateriaisUsados] = useState('');
  const [equipamentoOperando, setEquipamentoOperando] = useState(true);
  const [fotosDepois, setFotosDepois] = useState<FotoItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleChipAcao = (chip: string) => {
    setObservacoes(prev => {
      if (prev.includes(chip)) return prev;
      return prev ? `${prev}, ${chip}` : chip;
    });
  };

  const handleChipMaterial = (chip: string) => {
    setMateriaisUsados(prev => {
      if (prev.includes(chip)) return prev;
      return prev ? `${prev}, ${chip}` : chip;
    });
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId || !os) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `os-fotos/${tenantId}/${os.id}/depois_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('attachments').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      setFotosDepois(prev => [...prev, {
        url: urlData.publicUrl,
        name: file.name,
        fase: 'depois',
        timestamp: Date.now(),
      }]);
      toast({ title: 'Foto enviada!' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleFinalizar = () => {
    if (!os) return;
    if (!observacoes.trim()) {
      toast({
        title: 'Observação obrigatória',
        description: 'Descreva o que foi feito antes de finalizar.',
        variant: 'destructive',
      });
      return;
    }

    const allFotos = [...(state?.fotos || []), ...fotosDepois];
    const fotosText = allFotos.length > 0
      ? '\n\n[Fotos]: ' + allFotos.map(f => `${f.fase}: ${f.url}`).join(' | ')
      : '';
    const materiaisText = materiaisUsados.trim()
      ? `\n\n[Materiais]: ${materiaisUsados}`
      : '';
    const statusText = `\n\n[Equipamento operando após manutenção]: ${equipamentoOperando ? 'SIM' : 'NÃO'}`;

    updateOS.mutate(
      {
        id: os.id,
        status: 'FECHADA',
        acao_corretiva: observacoes + materiaisText + statusText + fotosText,
        data_fechamento: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          try { sessionStorage.removeItem(`mec_timer_${os.id}`); } catch { /* ignore */ }
          toast({ title: 'O.S. Finalizada!', description: `OS #${os.numero_os} fechada com sucesso.` });
          navigate('/mecanico');
        },
      },
    );
  };

  if (!os) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-bold">O.S. não encontrada</p>
        <Button variant="outline" className="mt-4 h-14 text-base rounded-2xl" onClick={() => navigate('/mecanico')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black">Finalizar OS #{os.numero_os}</h1>
          <p className="text-sm text-muted-foreground">{os.equipamento} · {os.tag}</p>
        </div>
      </div>

      {/* Observações com chips rápidos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">O que foi feito? *</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHIPS_ACAO.map(chip => (
            <button
              key={chip}
              onClick={() => handleChipAcao(chip)}
              className={cn(
                'px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all active:scale-95',
                observacoes.includes(chip)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card'
              )}
            >
              {chip}
            </button>
          ))}
        </div>
        <Textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          placeholder="Descreva o serviço realizado, condições encontradas..."
          rows={4}
          className="text-base rounded-2xl border-2"
        />
      </div>

      {/* Materiais com chips rápidos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Materiais usados</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHIPS_MATERIAIS.map(chip => (
            <button
              key={chip}
              onClick={() => handleChipMaterial(chip)}
              className={cn(
                'px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all active:scale-95',
                materiaisUsados.includes(chip)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card'
              )}
            >
              {chip}
            </button>
          ))}
        </div>
        <Textarea
          value={materiaisUsados}
          onChange={e => setMateriaisUsados(e.target.value)}
          placeholder="Ex: Rolamento 6205 (2un), Correia B-45..."
          rows={3}
          className="text-base rounded-2xl border-2"
        />
      </div>

      {/* Foto Depois da Manutenção */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Foto Depois da Manutenção</h3>
        </div>
        <label className="flex items-center gap-3 p-5 rounded-2xl border-2 border-dashed bg-card active:bg-muted/50 cursor-pointer transition-colors">
          {uploading
            ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
            : <Camera className="h-8 w-8 text-primary" />
          }
          <div className="flex-1">
            <p className="font-bold text-base">{uploading ? 'Enviando...' : 'Tirar Foto (depois)'}</p>
            <p className="text-sm text-muted-foreground">Registre o estado final do equipamento</p>
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
        {fotosDepois.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {fotosDepois.map((f, i) => (
              <div key={i} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2">
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => setFotosDepois(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Equipamento Operando? */}
      <button
        onClick={() => setEquipamentoOperando(prev => !prev)}
        className={cn(
          'w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.97]',
          equipamentoOperando
            ? 'border-green-400 bg-green-500/10'
            : 'border-red-400 bg-red-500/10'
        )}
      >
        {equipamentoOperando
          ? <ToggleRight className="h-10 w-10 text-green-600 flex-shrink-0" />
          : <ToggleLeft className="h-10 w-10 text-red-600 flex-shrink-0" />
        }
        <div className="text-left">
          <p className="font-bold text-base">Equipamento operando?</p>
          <p className={cn(
            'text-sm font-semibold',
            equipamentoOperando ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          )}>
            {equipamentoOperando ? 'SIM — equipamento voltou a funcionar' : 'NÃO — precisa de mais ação'}
          </p>
        </div>
      </button>

      {/* Fotos Antes/Durante (vindas da execução) */}
      {state?.fotos && state.fotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Fotos registradas durante execução</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {state.fotos.map((f, i) => (
              <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2">
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-semibold capitalize">
                  {f.fase}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão Finalizar */}
      <Button
        className="w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 transition-all shadow-lg"
        onClick={handleFinalizar}
        disabled={updateOS.isPending}
      >
        {updateOS.isPending
          ? <Loader2 className="h-8 w-8 animate-spin" />
          : <CheckCircle2 className="h-8 w-8" />
        }
        CONFIRMAR FINALIZAÇÃO
      </Button>
    </div>
  );
}
