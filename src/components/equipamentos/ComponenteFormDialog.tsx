import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  ComponenteEquipamento, 
  ComponenteInsert, 
  TIPOS_COMPONENTE, 
  ESTADOS_COMPONENTE,
  useCreateComponente,
  useUpdateComponente,
} from '@/hooks/useComponentesEquipamento';
import { Loader2, Plus, X } from 'lucide-react';

interface ComponenteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentoId: string;
  componente?: ComponenteEquipamento | null;
  parentId?: string | null;
  parentOptions?: { id: string; nome: string; codigo: string }[];
}

interface FormData {
  codigo: string;
  nome: string;
  tipo: string;
  parent_id: string | null;
  fabricante: string;
  modelo: string;
  numero_serie: string;
  potencia: string;
  rpm: string;
  tensao: string;
  corrente: string;
  diametro: string;
  comprimento: string;
  largura: string;
  altura: string;
  peso: string;
  quantidade: number;
  posicao: string;
  data_instalacao: string;
  vida_util_horas: string;
  horas_operacao: string;
  intervalo_manutencao_dias: string;
  estado: string;
  ativo: boolean;
  observacoes: string;
  especificacoes: { key: string; value: string }[];
}

const initialFormData: FormData = {
  codigo: '',
  nome: '',
  tipo: '',
  parent_id: null,
  fabricante: '',
  modelo: '',
  numero_serie: '',
  potencia: '',
  rpm: '',
  tensao: '',
  corrente: '',
  diametro: '',
  comprimento: '',
  largura: '',
  altura: '',
  peso: '',
  quantidade: 1,
  posicao: '',
  data_instalacao: '',
  vida_util_horas: '',
  horas_operacao: '0',
  intervalo_manutencao_dias: '',
  estado: 'BOM',
  ativo: true,
  observacoes: '',
  especificacoes: [],
};

export function ComponenteFormDialog({
  open,
  onOpenChange,
  equipamentoId,
  componente,
  parentId,
  parentOptions = [],
}: ComponenteFormDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const createMutation = useCreateComponente();
  const updateMutation = useUpdateComponente();

  const isEditing = !!componente;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (componente) {
      const specs = componente.especificacoes 
        ? Object.entries(componente.especificacoes).map(([key, value]) => ({ key, value }))
        : [];
      
      setFormData({
        codigo: componente.codigo,
        nome: componente.nome,
        tipo: componente.tipo,
        parent_id: componente.parent_id,
        fabricante: componente.fabricante || '',
        modelo: componente.modelo || '',
        numero_serie: componente.numero_serie || '',
        potencia: componente.potencia || '',
        rpm: componente.rpm || '',
        tensao: componente.tensao || '',
        corrente: componente.corrente || '',
        diametro: componente.dimensoes?.diametro || '',
        comprimento: componente.dimensoes?.comprimento || '',
        largura: componente.dimensoes?.largura || '',
        altura: componente.dimensoes?.altura || '',
        peso: componente.dimensoes?.peso || '',
        quantidade: componente.quantidade,
        posicao: componente.posicao || '',
        data_instalacao: componente.data_instalacao || '',
        vida_util_horas: componente.vida_util_horas?.toString() || '',
        horas_operacao: componente.horas_operacao.toString(),
        intervalo_manutencao_dias: componente.intervalo_manutencao_dias?.toString() || '',
        estado: componente.estado,
        ativo: componente.ativo,
        observacoes: componente.observacoes || '',
        especificacoes: specs,
      });
    } else {
      setFormData({
        ...initialFormData,
        parent_id: parentId || null,
      });
    }
  }, [componente, parentId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dimensoes = {
      diametro: formData.diametro || undefined,
      comprimento: formData.comprimento || undefined,
      largura: formData.largura || undefined,
      altura: formData.altura || undefined,
      peso: formData.peso || undefined,
    };

    const especificacoes = formData.especificacoes.reduce((acc, { key, value }) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const payload: ComponenteInsert = {
      equipamento_id: equipamentoId,
      parent_id: formData.parent_id || null,
      codigo: formData.codigo,
      nome: formData.nome,
      tipo: formData.tipo,
      fabricante: formData.fabricante || null,
      modelo: formData.modelo || null,
      numero_serie: formData.numero_serie || null,
      potencia: formData.potencia || null,
      rpm: formData.rpm || null,
      tensao: formData.tensao || null,
      corrente: formData.corrente || null,
      dimensoes: Object.keys(dimensoes).some(k => dimensoes[k as keyof typeof dimensoes]) ? dimensoes : null,
      especificacoes: Object.keys(especificacoes).length > 0 ? especificacoes : null,
      quantidade: formData.quantidade,
      posicao: formData.posicao || null,
      data_instalacao: formData.data_instalacao || null,
      vida_util_horas: formData.vida_util_horas ? parseInt(formData.vida_util_horas) : null,
      horas_operacao: parseInt(formData.horas_operacao) || 0,
      intervalo_manutencao_dias: formData.intervalo_manutencao_dias ? parseInt(formData.intervalo_manutencao_dias) : null,
      estado: formData.estado,
      ativo: formData.ativo,
      observacoes: formData.observacoes || null,
    };

    if (isEditing && componente) {
      await updateMutation.mutateAsync({ id: componente.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const addSpec = () => {
    setFormData(prev => ({
      ...prev,
      especificacoes: [...prev.especificacoes, { key: '', value: '' }],
    }));
  };

  const removeSpec = (index: number) => {
    setFormData(prev => ({
      ...prev,
      especificacoes: prev.especificacoes.filter((_, i) => i !== index),
    }));
  };

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      especificacoes: prev.especificacoes.map((spec, i) => 
        i === index ? { ...spec, [field]: value } : spec
      ),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Componente' : 'Novo Componente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="tecnico">Técnico</TabsTrigger>
              <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
              <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={e => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="MOT-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Motor Principal"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={value => setFormData(prev => ({ ...prev, tipo: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_COMPONENTE.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent">Componente Pai</Label>
                  <Select
                    value={formData.parent_id || 'none'}
                    onValueChange={value => setFormData(prev => ({ 
                      ...prev, 
                      parent_id: value === 'none' ? null : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (raiz)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (raiz)</SelectItem>
                      {parentOptions
                        .filter(p => p.id !== componente?.id)
                        .map(parent => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.codigo} - {parent.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fabricante">Fabricante</Label>
                  <Input
                    id="fabricante"
                    value={formData.fabricante}
                    onChange={e => setFormData(prev => ({ ...prev, fabricante: e.target.value }))}
                    placeholder="WEG"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={e => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    placeholder="W22 Plus"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_serie">Nº Série</Label>
                  <Input
                    id="numero_serie"
                    value={formData.numero_serie}
                    onChange={e => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))}
                    placeholder="SN123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={e => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="posicao">Posição</Label>
                  <Input
                    id="posicao"
                    value={formData.posicao}
                    onChange={e => setFormData(prev => ({ ...prev, posicao: e.target.value }))}
                    placeholder="Lado acoplamento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={value => setFormData(prev => ({ ...prev, estado: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_COMPONENTE.map(estado => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Componente Ativo</Label>
              </div>
            </TabsContent>

            <TabsContent value="tecnico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="potencia">Potência</Label>
                  <Input
                    id="potencia"
                    value={formData.potencia}
                    onChange={e => setFormData(prev => ({ ...prev, potencia: e.target.value }))}
                    placeholder="75 kW"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpm">RPM</Label>
                  <Input
                    id="rpm"
                    value={formData.rpm}
                    onChange={e => setFormData(prev => ({ ...prev, rpm: e.target.value }))}
                    placeholder="1750"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tensao">Tensão</Label>
                  <Input
                    id="tensao"
                    value={formData.tensao}
                    onChange={e => setFormData(prev => ({ ...prev, tensao: e.target.value }))}
                    placeholder="380V"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corrente">Corrente</Label>
                  <Input
                    id="corrente"
                    value={formData.corrente}
                    onChange={e => setFormData(prev => ({ ...prev, corrente: e.target.value }))}
                    placeholder="125A"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Especificações Adicionais</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSpec}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                
                {formData.especificacoes.map((spec, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Nome (ex: Classe Isolamento)"
                      value={spec.key}
                      onChange={e => updateSpec(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Valor (ex: F)"
                      value={spec.value}
                      onChange={e => updateSpec(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSpec(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="dimensoes" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diametro">Diâmetro</Label>
                  <Input
                    id="diametro"
                    value={formData.diametro}
                    onChange={e => setFormData(prev => ({ ...prev, diametro: e.target.value }))}
                    placeholder="50mm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comprimento">Comprimento</Label>
                  <Input
                    id="comprimento"
                    value={formData.comprimento}
                    onChange={e => setFormData(prev => ({ ...prev, comprimento: e.target.value }))}
                    placeholder="500mm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="largura">Largura</Label>
                  <Input
                    id="largura"
                    value={formData.largura}
                    onChange={e => setFormData(prev => ({ ...prev, largura: e.target.value }))}
                    placeholder="300mm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altura">Altura</Label>
                  <Input
                    id="altura"
                    value={formData.altura}
                    onChange={e => setFormData(prev => ({ ...prev, altura: e.target.value }))}
                    placeholder="400mm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="peso">Peso</Label>
                <Input
                  id="peso"
                  value={formData.peso}
                  onChange={e => setFormData(prev => ({ ...prev, peso: e.target.value }))}
                  placeholder="150kg"
                />
              </div>
            </TabsContent>

            <TabsContent value="manutencao" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_instalacao">Data de Instalação</Label>
                  <Input
                    id="data_instalacao"
                    type="date"
                    value={formData.data_instalacao}
                    onChange={e => setFormData(prev => ({ ...prev, data_instalacao: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vida_util_horas">Vida Útil (horas)</Label>
                  <Input
                    id="vida_util_horas"
                    type="number"
                    value={formData.vida_util_horas}
                    onChange={e => setFormData(prev => ({ ...prev, vida_util_horas: e.target.value }))}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horas_operacao">Horas de Operação</Label>
                  <Input
                    id="horas_operacao"
                    type="number"
                    value={formData.horas_operacao}
                    onChange={e => setFormData(prev => ({ ...prev, horas_operacao: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intervalo_manutencao">Intervalo Manutenção (dias)</Label>
                  <Input
                    id="intervalo_manutencao"
                    type="number"
                    value={formData.intervalo_manutencao_dias}
                    onChange={e => setFormData(prev => ({ ...prev, intervalo_manutencao_dias: e.target.value }))}
                    placeholder="90"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações sobre o componente..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
