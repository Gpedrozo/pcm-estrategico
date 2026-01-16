import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { useSolicitacoes, useCreateSolicitacao, useUpdateSolicitacao, type SolicitacaoRow } from '@/hooks/useSolicitacoes';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';

export default function Solicitacoes() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tag: '',
    solicitante_nome: '',
    solicitante_setor: '',
    descricao_falha: '',
    impacto: 'MEDIO' as 'ALTO' | 'MEDIO' | 'BAIXO',
    classificacao: 'PROGRAMAVEL' as 'EMERGENCIAL' | 'URGENTE' | 'PROGRAMAVEL',
  });

  const { data: solicitacoes, isLoading } = useSolicitacoes();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreateSolicitacao();

  const filteredSolicitacoes = solicitacoes?.filter(s => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return s.tag.toLowerCase().includes(searchLower) ||
           s.solicitante_nome.toLowerCase().includes(searchLower) ||
           s.descricao_falha.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    setIsModalOpen(false);
    setFormData({ tag: '', solicitante_nome: '', solicitante_setor: '', descricao_falha: '', impacto: 'MEDIO', classificacao: 'PROGRAMAVEL' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDENTE': 'bg-warning/10 text-warning',
      'APROVADA': 'bg-info/10 text-info',
      'CONVERTIDA': 'bg-success/10 text-success',
      'REJEITADA': 'bg-destructive/10 text-destructive',
      'CANCELADA': 'bg-muted text-muted-foreground',
    };
    return styles[status] || styles['PENDENTE'];
  };

  const getClassificacaoBadge = (classificacao: string) => {
    const styles: Record<string, string> = {
      'EMERGENCIAL': 'bg-destructive text-destructive-foreground',
      'URGENTE': 'bg-warning text-warning-foreground',
      'PROGRAMAVEL': 'bg-info/10 text-info',
    };
    return styles[classificacao] || '';
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
          <h1 className="text-2xl font-bold text-foreground">Solicitações de Manutenção</h1>
          <p className="text-muted-foreground">Gerencie as solicitações da produção • {solicitacoes?.length || 0} registros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por TAG, solicitante..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>TAG</th>
              <th>Solicitante</th>
              <th>Classificação</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredSolicitacoes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada</td></tr>
            ) : (
              filteredSolicitacoes.map((sol) => (
                <tr key={sol.id}>
                  <td className="font-mono font-medium">{sol.numero_solicitacao}</td>
                  <td className="font-mono text-primary">{sol.tag}</td>
                  <td>{sol.solicitante_nome}</td>
                  <td><Badge className={getClassificacaoBadge(sol.classificacao)}>{sol.classificacao}</Badge></td>
                  <td><Badge className={getStatusBadge(sol.status)}>{sol.status}</Badge></td>
                  <td className="flex items-center gap-1"><Clock className="h-3 w-3" />{sol.sla_horas}h</td>
                  <td>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Solicitante *</Label>
                <Input value={formData.solicitante_nome} onChange={(e) => setFormData({...formData, solicitante_nome: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={formData.solicitante_setor} onChange={(e) => setFormData({...formData, solicitante_setor: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Impacto</Label>
                <Select value={formData.impacto} onValueChange={(v: any) => setFormData({...formData, impacto: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTO">Alto</SelectItem>
                    <SelectItem value="MEDIO">Médio</SelectItem>
                    <SelectItem value="BAIXO">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classificação</Label>
                <Select value={formData.classificacao} onValueChange={(v: any) => setFormData({...formData, classificacao: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCIAL">Emergencial (2h)</SelectItem>
                    <SelectItem value="URGENTE">Urgente (8h)</SelectItem>
                    <SelectItem value="PROGRAMAVEL">Programável (72h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Falha *</Label>
              <Textarea value={formData.descricao_falha} onChange={(e) => setFormData({...formData, descricao_falha: e.target.value})} rows={3} required />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Registrar Solicitação</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
