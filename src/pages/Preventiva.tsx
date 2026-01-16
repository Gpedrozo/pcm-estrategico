import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Calendar, Clock, Settings } from 'lucide-react';
import { usePlanosPreventivos, useCreatePlanoPreventivo, type PlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useEquipamentos } from '@/hooks/useEquipamentos';

export default function Preventiva() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    tag: '',
    tipo_gatilho: 'TEMPO' as 'TEMPO' | 'CICLO' | 'CONDICAO',
    frequencia_dias: 30,
    tempo_estimado_min: 60,
    especialidade: '',
    instrucoes: '',
  });

  const { data: planos, isLoading } = usePlanosPreventivos();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreatePlanoPreventivo();

  const filteredPlanos = planos?.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return p.codigo.toLowerCase().includes(searchLower) ||
           p.nome.toLowerCase().includes(searchLower) ||
           p.tag?.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    setIsModalOpen(false);
    setFormData({ codigo: '', nome: '', descricao: '', tag: '', tipo_gatilho: 'TEMPO', frequencia_dias: 30, tempo_estimado_min: 60, especialidade: '', instrucoes: '' });
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manutenção Preventiva</h1>
          <p className="text-muted-foreground">Gerencie os planos preventivos • {planos?.length || 0} planos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Novo Plano</Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar planos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlanos.map((plano) => (
          <div key={plano.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono font-bold text-primary">{plano.codigo}</p>
                <p className="font-medium">{plano.nome}</p>
              </div>
              <Badge variant={plano.ativo ? 'default' : 'secondary'}>{plano.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </div>
            {plano.tag && <p className="text-sm text-muted-foreground mb-2">TAG: {plano.tag}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{plano.frequencia_dias}d</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{plano.tempo_estimado_min}min</span>
            </div>
            {plano.proxima_execucao && (
              <p className="text-xs mt-2 text-info">Próxima: {new Date(plano.proxima_execucao).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Plano Preventivo</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})} required />
              </div>
              <div className="space-y-2">
                <Label>TAG Equipamento</Label>
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
              <Label>Nome do Plano *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência (dias)</Label>
                <Input type="number" value={formData.frequencia_dias} onChange={(e) => setFormData({...formData, frequencia_dias: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Tempo Estimado (min)</Label>
                <Input type="number" value={formData.tempo_estimado_min} onChange={(e) => setFormData({...formData, tempo_estimado_min: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instruções</Label>
              <Textarea value={formData.instrucoes} onChange={(e) => setFormData({...formData, instrucoes: e.target.value})} rows={3} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Criar Plano</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
