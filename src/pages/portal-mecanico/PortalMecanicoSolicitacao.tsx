import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSolicitacao } from '@/hooks/useSolicitacoes';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useOptionalTenant } from '@/contexts/TenantContext';
import { usePortalMecanico } from '@/contexts/PortalMecanicoContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Search, Send, Camera, CheckCircle2,
  Loader2, X, AlertTriangle, AlertCircle, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Impacto = 'ALTO' | 'MEDIO' | 'BAIXO';

const IMPACTO_OPTIONS: { value: Impacto; label: string; desc: string; icon: React.ElementType; color: string; selected: string }[] = [
  { value: 'ALTO', label: 'Parou', desc: 'Equipamento parado', icon: AlertTriangle, color: 'border-border bg-card', selected: 'border-red-500 bg-red-500/10 text-red-800 dark:text-red-300 ring-2 ring-red-400/50' },
  { value: 'MEDIO', label: 'Reduzido', desc: 'Produção reduzida', icon: AlertCircle, color: 'border-border bg-card', selected: 'border-yellow-500 bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 ring-2 ring-yellow-400/50' },
  { value: 'BAIXO', label: 'Normal', desc: 'Sem impacto agora', icon: Shield, color: 'border-border bg-card', selected: 'border-green-500 bg-green-500/10 text-green-800 dark:text-green-300 ring-2 ring-green-400/50' },
];

const DESCRICAO_CHIPS = ['Vazamento', 'Vibração excessiva', 'Barulho estranho', 'Aquecimento', 'Não liga', 'Travando'];

export default function PortalMecanicoSolicitacao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tenantCtx = useOptionalTenant();
  const tenantId = tenantCtx?.tenant?.id ?? sessionStorage.getItem('portal_mecanico_empresa_id');
  const { mecanico } = usePortalMecanico();
  const { data: equipamentos } = useEquipamentos();
  const createSolicitacao = useCreateSolicitacao();

  const [equipamentoId, setEquipamentoId] = useState<string | null>(null);
  const [equipSearch, setEquipSearch] = useState('');
  const [descricao, setDescricao] = useState('');
  const [impacto, setImpacto] = useState<Impacto>('MEDIO');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const equipFiltrados = (equipamentos || []).filter(e => {
    if (!equipSearch.trim()) return false;
    const t = equipSearch.toLowerCase();
    return (e.tag || '').toLowerCase().includes(t) || (e.nome || '').toLowerCase().includes(t);
  }).slice(0, 8);

  const equipSelecionado = (equipamentos || []).find(e => e.id === equipamentoId);

  const handleDescChip = (chip: string) => {
    setDescricao(prev => prev.includes(chip) ? prev : prev ? `${prev}, ${chip.toLowerCase()}` : chip);
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `solicitacao-fotos/${tenantId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type });
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      setFotoUrl(data.publicUrl);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleEnviar = () => {
    if (!equipSelecionado) { toast({ title: 'Selecione o equipamento', variant: 'destructive' }); return; }
    if (!descricao.trim()) { toast({ title: 'Descreva o problema', variant: 'destructive' }); return; }

    createSolicitacao.mutate(
      {
        tag: equipSelecionado.tag || '',
        equipamento_id: equipSelecionado.id,
        solicitante_nome: mecanico?.nome || 'Mecânico',
        solicitante_setor: 'Manutenção',
        descricao_falha: descricao,
        impacto,
        observacoes: fotoUrl ? `[Foto anexada]: ${fotoUrl}` : null,
      },
      { onSuccess: () => setEnviado(true) },
    );
  };

  if (enviado) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black">Solicitação Enviada!</h2>
          <p className="text-base text-muted-foreground">Sua solicitação foi registrada e será analisada pela equipe de planejamento.</p>
          <Button className="w-full h-16 text-lg font-bold rounded-2xl bg-orange-500 hover:bg-orange-600" onClick={() => navigate('/portal-mecanico')}>
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-6 pb-8 md:pt-16">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/portal-mecanico')} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-black">Nova Solicitação</h1>
      </div>

      {/* Equipamento */}
      <div className="space-y-2">
        <p className="text-base font-bold">Equipamento *</p>
        {equipSelecionado ? (
          <div className="rounded-2xl border-2 border-orange-500 p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-base">{equipSelecionado.nome}</p>
              <p className="text-sm text-muted-foreground">{equipSelecionado.tag}</p>
            </div>
            <button onClick={() => { setEquipamentoId(null); setEquipSearch(''); }} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border hover:bg-muted">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input value={equipSearch} onChange={e => setEquipSearch(e.target.value)} placeholder="Buscar por TAG ou nome..." className="pl-11 h-14 text-base rounded-2xl border-2" autoFocus />
            </div>
            {equipFiltrados.length > 0 && (
              <div className="border-2 rounded-2xl overflow-hidden divide-y max-h-48 overflow-y-auto">
                {equipFiltrados.map(e => (
                  <button key={e.id} onClick={() => { setEquipamentoId(e.id); setEquipSearch(''); }} className="w-full p-4 text-left hover:bg-muted active:bg-muted/80 transition-colors">
                    <p className="font-semibold text-base">{e.nome}</p>
                    <p className="text-sm text-muted-foreground">{e.tag}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <p className="text-base font-bold">Descreva o problema *</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {DESCRICAO_CHIPS.map(chip => (
            <button key={chip} onClick={() => handleDescChip(chip)} className={cn(
              'px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all active:scale-95',
              descricao.toLowerCase().includes(chip.toLowerCase()) ? 'border-orange-500 bg-orange-500/10 text-orange-700' : 'border-border bg-card'
            )}>
              {chip}
            </button>
          ))}
        </div>
        <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: motor fazendo barulho estranho..." rows={4} className="text-base rounded-2xl border-2" />
      </div>

      {/* Impacto */}
      <div className="space-y-2">
        <p className="text-base font-bold">Quão grave é?</p>
        <div className="grid grid-cols-3 gap-2">
          {IMPACTO_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setImpacto(opt.value)} className={cn(
              'flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all active:scale-95',
              impacto === opt.value ? opt.selected : opt.color,
            )}>
              <opt.icon className="h-7 w-7" />
              <span className="text-sm font-bold">{opt.label}</span>
              <span className="text-[10px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foto */}
      <div className="space-y-2">
        <p className="text-base font-bold">Foto (opcional)</p>
        {fotoUrl ? (
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2">
            <img src={fotoUrl} alt="Anexo" className="w-full h-full object-cover" />
            <button onClick={() => setFotoUrl(null)} className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-5 rounded-2xl border-2 border-dashed bg-card cursor-pointer active:bg-muted/50 transition-colors">
            {uploading ? <Loader2 className="h-8 w-8 animate-spin text-orange-500" /> : <Camera className="h-8 w-8 text-orange-500" />}
            <span className="text-base text-muted-foreground font-medium">{uploading ? 'Enviando...' : 'Tirar foto ou anexar imagem'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Enviar */}
      <Button className="w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 transition-all shadow-xl bg-orange-500 hover:bg-orange-600" onClick={handleEnviar} disabled={createSolicitacao.isPending}>
        {createSolicitacao.isPending ? <Loader2 className="h-7 w-7 animate-spin" /> : <Send className="h-7 w-7" />}
        ENVIAR SOLICITAÇÃO
      </Button>
    </div>
  );
}
