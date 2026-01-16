import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, ClipboardCheck, AlertTriangle, Eye } from 'lucide-react';
import { useInspecoes, useCreateInspecao, useUpdateInspecao, type InspecaoRow } from '@/hooks/useInspecoes';
import { useAuth } from '@/contexts/AuthContext';

export default function Inspecoes() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    rota_nome: '',
    descricao: '',
    turno: 'A',
    inspetor_nome: user?.nome || '',
  });

  const { data: inspecoes, isLoading } = useInspecoes();
  const createMutation = useCreateInspecao();
  const updateMutation = useUpdateInspecao();

  const filteredInspecoes = inspecoes?.filter(i => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return i.rota_nome.toLowerCase().includes(searchLower) ||
           i.inspetor_nome.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      inspetor_id: user?.id,
      hora_inicio: new Date().toTimeString().split(' ')[0].substring(0, 5),
    });
    setIsModalOpen(false);
    setFormData({ rota_nome: '', descricao: '', turno: 'A', inspetor_nome: user?.nome || '' });
  };

  const handleConcluir = async (inspecao: InspecaoRow) => {
    await updateMutation.mutateAsync({
      id: inspecao.id,
      status: 'CONCLUIDA',
      hora_fim: new Date().toTimeString().split(' ')[0].substring(0, 5),
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PLANEJADA': 'bg-muted text-muted-foreground',
      'EM_ANDAMENTO': 'bg-info/10 text-info',
      'CONCLUIDA': 'bg-success/10 text-success',
      'CANCELADA': 'bg-destructive/10 text-destructive',
    };
    return styles[status] || '';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspeções de Rota</h1>
          <p className="text-muted-foreground">Gerencie as inspeções preventivas • {inspecoes?.length || 0} registros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Inspeção
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por rota, inspetor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Rota</th>
              <th>Turno</th>
              <th>Inspetor</th>
              <th>Status</th>
              <th>Anomalias</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredInspecoes.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma inspeção encontrada</td></tr>
            ) : (
              filteredInspecoes.map((insp) => (
                <tr key={insp.id}>
                  <td className="font-mono font-medium">{insp.numero_inspecao}</td>
                  <td className="font-medium">{insp.rota_nome}</td>
                  <td>Turno {insp.turno}</td>
                  <td>{insp.inspetor_nome}</td>
                  <td><Badge className={getStatusBadge(insp.status)}>{insp.status?.replace('_', ' ')}</Badge></td>
                  <td>
                    {insp.anomalias_encontradas > 0 ? (
                      <span className="flex items-center gap-1 text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        {insp.anomalias_encontradas}
                      </span>
                    ) : (
                      <span className="text-success">0</span>
                    )}
                  </td>
                  <td>{new Date(insp.data_inspecao).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="flex gap-1">
                      {insp.status === 'EM_ANDAMENTO' && (
                        <Button size="sm" variant="outline" onClick={() => handleConcluir(insp)}>
                          <ClipboardCheck className="h-3 w-3 mr-1" />Concluir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Inspeção de Rota</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Rota *</Label>
              <Input 
                value={formData.rota_nome} 
                onChange={(e) => setFormData({...formData, rota_nome: e.target.value})} 
                placeholder="Ex: Rota Compressores, Rota Caldeiras..."
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={formData.turno} onValueChange={(v) => setFormData({...formData, turno: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Turno A (06:00-14:00)</SelectItem>
                    <SelectItem value="B">Turno B (14:00-22:00)</SelectItem>
                    <SelectItem value="C">Turno C (22:00-06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Inspetor</Label>
                <Input value={formData.inspetor_nome} onChange={(e) => setFormData({...formData, inspetor_nome: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.descricao} 
                onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                rows={2}
                placeholder="Observações sobre a rota..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Iniciar Inspeção</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
