import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSolicitacao } from '@/hooks/useSolicitacoes';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Search,
  Send,
  Camera,
  CheckCircle2,
  Loader2,
  X,
  AlertTriangle,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Impacto = 'ALTO' | 'MEDIO' | 'BAIXO';

const IMPACTO_OPTIONS: { value: Impacto; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { value: 'ALTO', label: 'Parou', desc: 'Equipamento parado', icon: AlertTriangle, color: 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300' },
  { value: 'MEDIO', label: 'Reduzido', desc: 'Produção reduzida', icon: AlertCircle, color: 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300' },
  { value: 'BAIXO', label: 'Normal', desc: 'Sem impacto agora', icon: Shield, color: 'border-green-400 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300' },
];

export default function MecanicoNovaSolicitacao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, tenantId } = useAuth();
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
    if (!equipSelecionado) {
      toast({ title: 'Selecione o equipamento', variant: 'destructive' });
      return;
    }
    if (!descricao.trim()) {
      toast({ title: 'Descreva o problema', variant: 'destructive' });
      return;
    }

    createSolicitacao.mutate(
      {
        tag: equipSelecionado.tag || '',
        equipamento_id: equipSelecionado.id,
        solicitante_nome: user?.nome || 'Mecânico',
        solicitante_setor: 'Manutenção',
        descricao_falha: descricao,
        impacto,
        observacoes: fotoUrl ? `[Foto anexada]: ${fotoUrl}` : null,
      },
      {
        onSuccess: () => setEnviado(true),
      },
    );
  };

  /* ─── Tela de Sucesso ─── */
  if (enviado) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Solicitação Enviada!</h2>
            <p className="text-sm text-muted-foreground">
              Sua solicitação foi registrada e será analisada pela equipe de planejamento.
            </p>
            <Button className="w-full h-12 text-base" onClick={() => navigate('/mecanico')}>
              Voltar ao Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/mecanico')} className="p-2 rounded-lg hover:bg-muted active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Nova Solicitação</h1>
      </div>

      {/* Equipamento */}
      <div className="space-y-2">
        <Label className="text-base">Equipamento *</Label>
        {equipSelecionado ? (
          <Card className="border-primary">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{equipSelecionado.nome}</p>
                <p className="text-xs text-muted-foreground">{equipSelecionado.tag}</p>
              </div>
              <button onClick={() => { setEquipamentoId(null); setEquipSearch(''); }} className="p-1">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={equipSearch}
                onChange={e => setEquipSearch(e.target.value)}
                placeholder="Buscar por TAG ou nome..."
                className="pl-9 h-12 text-base"
                autoFocus
              />
            </div>
            {equipFiltrados.length > 0 && (
              <div className="border rounded-xl overflow-hidden divide-y max-h-48 overflow-y-auto">
                {equipFiltrados.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { setEquipamentoId(e.id); setEquipSearch(''); }}
                    className="w-full p-3 text-left hover:bg-muted active:bg-muted/80 transition-colors"
                  >
                    <p className="font-medium text-sm">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">{e.tag}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label className="text-base">Descreva o problema *</Label>
        <Textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Ex: motor fazendo barulho estranho, vibração excessiva..."
          rows={4}
          className="text-base"
        />
      </div>

      {/* Impacto */}
      <div className="space-y-2">
        <Label className="text-base">Quão grave é?</Label>
        <div className="grid grid-cols-3 gap-2">
          {IMPACTO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setImpacto(opt.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all active:scale-95',
                impacto === opt.value ? opt.color + ' border-2' : 'border-border bg-card',
              )}
            >
              <opt.icon className="h-6 w-6" />
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-[10px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foto */}
      <div className="space-y-2">
        <Label className="text-base">Foto (opcional)</Label>
        {fotoUrl ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border">
            <img src={fotoUrl} alt="Anexo" className="w-full h-full object-cover" />
            <button
              onClick={() => setFotoUrl(null)}
              className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-4 rounded-xl border border-dashed bg-card cursor-pointer active:bg-muted/50 transition-colors">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Camera className="h-6 w-6 text-primary" />}
            <span className="text-sm text-muted-foreground">{uploading ? 'Enviando...' : 'Tirar foto ou anexar imagem'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Enviar */}
      <Button
        className="w-full h-14 text-lg font-bold gap-2 rounded-xl active:scale-95"
        onClick={handleEnviar}
        disabled={createSolicitacao.isPending}
      >
        {createSolicitacao.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        ENVIAR SOLICITAÇÃO
      </Button>
    </div>
  );
}
