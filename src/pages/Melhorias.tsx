import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Lightbulb, TrendingUp, DollarSign } from 'lucide-react';
import { useMelhorias, useCreateMelhoria, type MelhoriaRow } from '@/hooks/useMelhorias';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';

export default function Melhorias() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tag: '',
    tipo: 'KAIZEN' as 'KAIZEN' | 'PROJETO' | 'LICAO_APRENDIDA' | 'SUGESTAO',
    area: '',
    situacao_antes: '',
    situacao_depois: '',
    beneficios: '',
    custo_implementacao: 0,
    economia_anual: 0,
  });

  const { data: melhorias, isLoading } = useMelhorias();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreateMelhoria();

  const filteredMelhorias = melhorias?.filter(m => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return m.titulo.toLowerCase().includes(searchLower) ||
           m.tag?.toLowerCase().includes(searchLower) ||
           m.proponente_nome.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      proponente_id: user?.id,
      proponente_nome: user?.nome || '',
    });
    setIsModalOpen(false);
    setFormData({
      titulo: '', descricao: '', tag: '', tipo: 'KAIZEN', area: '',
      situacao_antes: '', situacao_depois: '', beneficios: '', custo_implementacao: 0, economia_anual: 0
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PROPOSTA': 'bg-muted text-muted-foreground',
      'EM_AVALIACAO': 'bg-info/10 text-info',
      'APROVADA': 'bg-success/10 text-success',
      'EM_IMPLEMENTACAO': 'bg-warning/10 text-warning',
      'IMPLEMENTADA': 'bg-primary/10 text-primary',
      'REJEITADA': 'bg-destructive/10 text-destructive',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      'KAIZEN': 'bg-blue-500/10 text-blue-500',
      'PROJETO': 'bg-green-500/10 text-green-500',
      'LICAO_APRENDIDA': 'bg-yellow-500/10 text-yellow-500',
      'SUGESTAO': 'bg-purple-500/10 text-purple-500',
    };
    return styles[tipo] || '';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Calculate totals
  const totalEconomia = melhorias?.filter(m => m.status === 'IMPLEMENTADA').reduce((acc, m) => acc + (m.economia_anual || 0), 0) || 0;
  const totalCusto = melhorias?.filter(m => m.status === 'IMPLEMENTADA').reduce((acc, m) => acc + (m.custo_implementacao || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Melhorias</h1>
          <p className="text-muted-foreground">Propostas e projetos de melhoria contínua • {melhorias?.length || 0} registros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Melhoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Total de Propostas</p>
          </div>
          <p className="text-2xl font-bold">{melhorias?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <p className="text-sm text-muted-foreground">Implementadas</p>
          </div>
          <p className="text-2xl font-bold text-success">{melhorias?.filter(m => m.status === 'IMPLEMENTADA').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Economia Anual</p>
          </div>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalEconomia)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Investido</p>
          </div>
          <p className="text-xl font-bold">{formatCurrency(totalCusto)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar melhorias..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Título</th>
              <th>Tipo</th>
              <th>Proponente</th>
              <th>Status</th>
              <th>Economia Anual</th>
              <th>ROI</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredMelhorias.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma melhoria encontrada</td></tr>
            ) : (
              filteredMelhorias.map((melhoria) => (
                <tr key={melhoria.id}>
                  <td className="font-mono font-medium">{melhoria.numero_melhoria}</td>
                  <td className="max-w-[200px] truncate">{melhoria.titulo}</td>
                  <td><Badge className={getTipoBadge(melhoria.tipo)}>{melhoria.tipo}</Badge></td>
                  <td>{melhoria.proponente_nome}</td>
                  <td><Badge className={getStatusBadge(melhoria.status)}>{melhoria.status?.replace('_', ' ')}</Badge></td>
                  <td className="text-success font-medium">{formatCurrency(melhoria.economia_anual || 0)}</td>
                  <td>{melhoria.roi_meses ? `${melhoria.roi_meses} meses` : '-'}</td>
                  <td>{new Date(melhoria.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Proposta de Melhoria</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Melhoria *</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KAIZEN">Kaizen</SelectItem>
                    <SelectItem value="PROJETO">Projeto</SelectItem>
                    <SelectItem value="LICAO_APRENDIDA">Lição Aprendida</SelectItem>
                    <SelectItem value="SUGESTAO">Sugestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TAG do Equipamento</Label>
                <Select value={formData.tag} onValueChange={(v) => setFormData({...formData, tag: v})}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {equipamentos?.filter(e => e.ativo).map(e => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título da Melhoria *</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Descrição Detalhada *</Label>
              <Textarea value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} rows={3} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Situação Antes</Label>
                <Textarea value={formData.situacao_antes} onChange={(e) => setFormData({...formData, situacao_antes: e.target.value})} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Situação Depois</Label>
                <Textarea value={formData.situacao_depois} onChange={(e) => setFormData({...formData, situacao_depois: e.target.value})} rows={2} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Benefícios Esperados</Label>
              <Textarea value={formData.beneficios} onChange={(e) => setFormData({...formData, beneficios: e.target.value})} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo de Implementação (R$)</Label>
                <Input type="number" value={formData.custo_implementacao} onChange={(e) => setFormData({...formData, custo_implementacao: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Economia Anual Estimada (R$)</Label>
                <Input type="number" value={formData.economia_anual} onChange={(e) => setFormData({...formData, economia_anual: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            {formData.custo_implementacao > 0 && formData.economia_anual > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">ROI Estimado:</p>
                <p className="text-2xl font-bold">{((formData.custo_implementacao / formData.economia_anual) * 12).toFixed(1)} meses</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Registrar Melhoria</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
