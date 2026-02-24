import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePlanoLubrificacao } from '@/hooks/useLubrificacao';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { uploadToStorage } from '@/services/storage';
import type { PlanoLubrificacaoInsert } from '@/types/lubrificacao';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function PlanoFormDialog({ open, onOpenChange }: Props) {
  const create = useCreatePlanoLubrificacao();
  const { data: equipamentos } = useEquipamentos();

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [equipamentoId, setEquipamentoId] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [ponto, setPonto] = useState('');
  const [tipoLubrificante, setTipoLubrificante] = useState('');
  const [codigoLubrificante, setCodigoLubrificante] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [ferramenta, setFerramenta] = useState('');
  const [periodicidadeTipo, setPeriodicidadeTipo] = useState<'DIAS' | 'SEMANAS' | 'MESES' | 'HORAS'>('DIAS');
  const [periodicidadeValor, setPeriodicidadeValor] = useState<number | ''>('');
  const [tempoEstimado, setTempoEstimado] = useState<number | ''>('');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [nivelCriticidade, setNivelCriticidade] = useState<'ALTA' | 'MEDIA' | 'BAIXA' | ''>('');
  const [instrucoesFile, setInstrucoesFile] = useState<File | null>(null);

  const handleFileChange = (f?: File | null) => {
    setInstrucoesFile(f || null);
  };

  const handleCreate = async () => {
    const payload: PlanoLubrificacaoInsert = {
      codigo: codigo || `L-${Date.now()}`,
      nome,
      equipamento_id: equipamentoId || undefined,
      tag: tag || undefined,
      localizacao: localizacao || undefined,
      ponto: ponto || undefined,
      tipo_lubrificante: tipoLubrificante || undefined,
      codigo_lubrificante: codigoLubrificante || undefined,
      quantidade: quantidade === '' ? undefined : Number(quantidade),
      ferramenta: ferramenta || undefined,
      periodicidade_tipo: periodicidadeTipo,
      periodicidade_valor: periodicidadeValor === '' ? undefined : Number(periodicidadeValor),
      tempo_estimado_min: tempoEstimado === '' ? 0 : Number(tempoEstimado),
      responsavel: responsavel || undefined,
      observacoes: observacoes || undefined,
      nivel_criticidade: nivelCriticidade || undefined,
      instrucoes: null,
      anexos: null,
      ativo: true,
    } as any;

    try {
      if (instrucoesFile) {
        const path = `lubrificacao/instrucoes/${Date.now()}-${instrucoesFile.name}`;
        // bucket 'public' may be large; upload async but don't block UI too long
        const url = await uploadToStorage('public', path, instrucoesFile);
        (payload as any).instrucoes = url;
        (payload as any).anexos = JSON.stringify([{ url, name: instrucoesFile.name }]);
      }

      create.mutate(payload);
      onOpenChange(false);
    } catch (err) {
      console.error('Erro upload instrucoes', err);
      create.mutate(payload); // fallback: create plano without file link
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Plano de Lubrificação</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Código</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div>
            <Label>Equipamento</Label>
            <Select onValueChange={(v) => setEquipamentoId(v || null)}>
              <SelectTrigger>
                <SelectValue>{equipamentoId ? equipamentos?.find(e => e.id === equipamentoId)?.tag : 'Selecione'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {equipamentos?.map(eq => (<SelectItem key={eq.id} value={eq.id}>{eq.tag} — {eq.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>TAG</Label>
            <Input value={tag} onChange={(e) => setTag(e.target.value)} />
          </div>
          <div>
            <Label>Localização</Label>
            <Input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} />
          </div>
          <div>
            <Label>Ponto de lubrificação</Label>
            <Input value={ponto} onChange={(e) => setPonto(e.target.value)} />
          </div>
          <div>
            <Label>Tipo de lubrificante</Label>
            <Input value={tipoLubrificante} onChange={(e) => setTipoLubrificante(e.target.value)} />
          </div>
          <div>
            <Label>Código do lubrificante</Label>
            <Input value={codigoLubrificante} onChange={(e) => setCodigoLubrificante(e.target.value)} />
          </div>
          <div>
            <Label>Quantidade prevista</Label>
            <Input value={quantidade as any} onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <Label>Ferramenta necessária</Label>
            <Input value={ferramenta} onChange={(e) => setFerramenta(e.target.value)} />
          </div>
          <div>
            <Label>Periodicidade (tipo)</Label>
            <Select onValueChange={(v: any) => setPeriodicidadeTipo(v)}>
              <SelectTrigger>
                <SelectValue>{periodicidadeTipo}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIAS">Dias</SelectItem>
                <SelectItem value="SEMANAS">Semanas</SelectItem>
                <SelectItem value="MESES">Meses</SelectItem>
                <SelectItem value="HORAS">Horas máquina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Periodicidade (valor)</Label>
            <Input value={periodicidadeValor as any} onChange={(e) => setPeriodicidadeValor(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <Label>Tempo estimado (min)</Label>
            <Input value={tempoEstimado as any} onChange={(e) => setTempoEstimado(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div>
            <Label>Nível de criticidade</Label>
            <Select onValueChange={(v: any) => setNivelCriticidade(v)}>
              <SelectTrigger>
                <SelectValue>{nivelCriticidade || '—'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Observações técnicas</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          <div className="col-span-2">
            <Label>Anexar instruções / imagens</Label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
          </div>

          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Salvar Plano</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
