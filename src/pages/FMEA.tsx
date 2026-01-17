import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search } from 'lucide-react';
import { useFMEA, useCreateFMEA } from '@/hooks/useFMEA';
import { useEquipamentos } from '@/hooks/useEquipamentos';

export default function FMEA() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tag: '',
    funcao: '',
    falha_funcional: '',
    modo_falha: '',
    efeito_falha: '',
    causa_falha: '',
    severidade: 5,
    ocorrencia: 5,
    deteccao: 5,
    acao_recomendada: '',
    responsavel: '',
  });

  const { data: fmeas, isLoading } = useFMEA();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreateFMEA();

  const filteredFMEAs = fmeas?.filter(f => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return f.tag.toLowerCase().includes(searchLower) ||
           f.modo_falha.toLowerCase().includes(searchLower) ||
           f.funcao.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    setIsModalOpen(false);
    setFormData({
      tag: '', funcao: '', falha_funcional: '', modo_falha: '', efeito_falha: '', 
      causa_falha: '', severidade: 5, ocorrencia: 5, deteccao: 5, acao_recomendada: '', responsavel: ''
    });
  };

  const getRPNBadge = (rpn: number) => {
    if (rpn >= 200) return 'bg-destructive text-destructive-foreground';
    if (rpn >= 100) return 'bg-warning text-warning-foreground';
    if (rpn >= 50) return 'bg-info/10 text-info';
    return 'bg-success/10 text-success';
  };

  const getRPNLabel = (rpn: number) => {
    if (rpn >= 200) return 'Crítico';
    if (rpn >= 100) return 'Alto';
    if (rpn >= 50) return 'Médio';
    return 'Baixo';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Stats
  const totalFMEAs = fmeas?.length || 0;
  const criticoCount = fmeas?.filter(f => (f.rpn || 0) >= 200).length || 0;
  const altoCount = fmeas?.filter(f => (f.rpn || 0) >= 100 && (f.rpn || 0) < 200).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise FMEA</h1>
          <p className="text-muted-foreground">Análise de Modos e Efeitos de Falha • {totalFMEAs} registros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Análise
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total de Análises</p>
          <p className="text-2xl font-bold">{totalFMEAs}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-destructive">Risco Crítico (RPN≥200)</p>
          <p className="text-2xl font-bold text-destructive">{criticoCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-warning">Risco Alto (RPN≥100)</p>
          <p className="text-2xl font-bold text-warning">{altoCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Com Ações Pendentes</p>
          <p className="text-2xl font-bold">{fmeas?.filter(f => f.status === 'PENDENTE').length || 0}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por TAG, modo de falha..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>TAG</th>
              <th>Função</th>
              <th>Modo de Falha</th>
              <th>S</th>
              <th>O</th>
              <th>D</th>
              <th>RPN</th>
              <th>Risco</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredFMEAs.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma análise FMEA encontrada</td></tr>
            ) : (
              filteredFMEAs.map((fmea) => (
                <tr key={fmea.id}>
                  <td className="font-mono text-primary font-medium">{fmea.tag}</td>
                  <td className="max-w-[200px] truncate">{fmea.funcao}</td>
                  <td className="max-w-[200px] truncate">{fmea.modo_falha}</td>
                  <td className="text-center">{fmea.severidade}</td>
                  <td className="text-center">{fmea.ocorrencia}</td>
                  <td className="text-center">{fmea.deteccao}</td>
                  <td className="text-center font-bold">{fmea.rpn}</td>
                  <td><Badge className={getRPNBadge(fmea.rpn || 0)}>{getRPNLabel(fmea.rpn || 0)}</Badge></td>
                  <td><Badge variant={fmea.status === 'CONCLUIDO' ? 'default' : 'secondary'}>{fmea.status}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Análise FMEA</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAG do Equipamento *</Label>
                <Select value={formData.tag} onValueChange={(v) => setFormData({...formData, tag: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {equipamentos?.filter(e => e.ativo).map(e => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag} - {e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={formData.responsavel} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Função do Equipamento *</Label>
              <Input value={formData.funcao} onChange={(e) => setFormData({...formData, funcao: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Falha Funcional *</Label>
              <Input value={formData.falha_funcional} onChange={(e) => setFormData({...formData, falha_funcional: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Modo de Falha *</Label>
              <Input value={formData.modo_falha} onChange={(e) => setFormData({...formData, modo_falha: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Efeito da Falha</Label>
                <Textarea value={formData.efeito_falha} onChange={(e) => setFormData({...formData, efeito_falha: e.target.value})} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Causa da Falha</Label>
                <Textarea value={formData.causa_falha} onChange={(e) => setFormData({...formData, causa_falha: e.target.value})} rows={2} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Severidade (1-10)</Label>
                <Input type="number" min={1} max={10} value={formData.severidade} onChange={(e) => setFormData({...formData, severidade: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Ocorrência (1-10)</Label>
                <Input type="number" min={1} max={10} value={formData.ocorrencia} onChange={(e) => setFormData({...formData, ocorrencia: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Detecção (1-10)</Label>
                <Input type="number" min={1} max={10} value={formData.deteccao} onChange={(e) => setFormData({...formData, deteccao: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">RPN Calculado:</p>
              <p className="text-2xl font-bold">{formData.severidade * formData.ocorrencia * formData.deteccao}</p>
            </div>

            <div className="space-y-2">
              <Label>Ação Recomendada</Label>
              <Textarea value={formData.acao_recomendada} onChange={(e) => setFormData({...formData, acao_recomendada: e.target.value})} rows={2} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Salvar Análise</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
