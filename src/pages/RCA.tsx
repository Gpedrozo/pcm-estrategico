import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, GitBranch, CheckCircle2, XCircle } from 'lucide-react';
import { useRCAs, useCreateRCA, type RCARow } from '@/hooks/useRCA';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';

export default function RCA() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao_problema: '',
    tag: '',
    metodo_analise: '5_PORQUES' as '5_PORQUES' | 'ISHIKAWA' | 'ARVORE_FALHAS',
    porque_1: '',
    porque_2: '',
    porque_3: '',
    porque_4: '',
    porque_5: '',
    causa_raiz_identificada: '',
  });

  const { data: rcas, isLoading } = useRCAs();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreateRCA();

  const filteredRCAs = rcas?.filter(r => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return r.titulo.toLowerCase().includes(searchLower) ||
           r.tag?.toLowerCase().includes(searchLower) ||
           r.descricao_problema.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      responsavel_id: user?.id,
      responsavel_nome: user?.nome,
    });
    setIsModalOpen(false);
    setFormData({
      titulo: '', descricao_problema: '', tag: '', metodo_analise: '5_PORQUES',
      porque_1: '', porque_2: '', porque_3: '', porque_4: '', porque_5: '', causa_raiz_identificada: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'EM_ANALISE': 'bg-info/10 text-info',
      'CONCLUIDA': 'bg-success/10 text-success',
      'AGUARDANDO_ACOES': 'bg-warning/10 text-warning',
      'VERIFICANDO_EFICACIA': 'bg-primary/10 text-primary',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
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
          <h1 className="text-2xl font-bold text-foreground">Análise de Causa Raiz</h1>
          <p className="text-muted-foreground">Metodologias 5 Porquês, Ishikawa e Árvore de Falhas • {rcas?.length || 0} análises</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova RCA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{rcas?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-info">Em Análise</p>
          <p className="text-2xl font-bold text-info">{rcas?.filter(r => r.status === 'EM_ANALISE').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-warning">Aguardando Ações</p>
          <p className="text-2xl font-bold text-warning">{rcas?.filter(r => r.status === 'AGUARDANDO_ACOES').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-success">Concluídas</p>
          <p className="text-2xl font-bold text-success">{rcas?.filter(r => r.status === 'CONCLUIDA').length || 0}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título, TAG..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº RCA</th>
              <th>Título</th>
              <th>TAG</th>
              <th>Método</th>
              <th>Responsável</th>
              <th>Status</th>
              <th>Eficácia</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredRCAs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma RCA encontrada</td></tr>
            ) : (
              filteredRCAs.map((rca) => (
                <tr key={rca.id}>
                  <td className="font-mono font-medium">{rca.numero_rca}</td>
                  <td className="max-w-[200px] truncate">{rca.titulo}</td>
                  <td className="font-mono text-primary">{rca.tag || '-'}</td>
                  <td>{rca.metodo_analise?.replace('_', ' ')}</td>
                  <td>{rca.responsavel_nome}</td>
                  <td><Badge className={getStatusBadge(rca.status)}>{rca.status?.replace('_', ' ')}</Badge></td>
                  <td>
                    {rca.eficacia_verificada === null ? (
                      <span className="text-muted-foreground">-</span>
                    ) : rca.eficacia_verificada ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </td>
                  <td>{new Date(rca.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Análise de Causa Raiz</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAG do Equipamento</Label>
                <Select value={formData.tag} onValueChange={(v) => setFormData({...formData, tag: v})}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {equipamentos?.filter(e => e.ativo).map(e => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag} - {e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de Análise</Label>
                <Select value={formData.metodo_analise} onValueChange={(v: any) => setFormData({...formData, metodo_analise: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5_PORQUES">5 Porquês</SelectItem>
                    <SelectItem value="ISHIKAWA">Diagrama de Ishikawa</SelectItem>
                    <SelectItem value="ARVORE_FALHAS">Árvore de Falhas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título da Análise *</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Descrição do Problema *</Label>
              <Textarea value={formData.descricao_problema} onChange={(e) => setFormData({...formData, descricao_problema: e.target.value})} rows={3} required />
            </div>

            {formData.metodo_analise === '5_PORQUES' && (
              <div className="space-y-3 border-l-4 border-primary pl-4">
                <h3 className="font-semibold flex items-center gap-2"><GitBranch className="h-4 w-4" />Análise 5 Porquês</h3>
                <div className="space-y-2">
                  <Label>1º Por quê?</Label>
                  <Input value={formData.porque_1} onChange={(e) => setFormData({...formData, porque_1: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>2º Por quê?</Label>
                  <Input value={formData.porque_2} onChange={(e) => setFormData({...formData, porque_2: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>3º Por quê?</Label>
                  <Input value={formData.porque_3} onChange={(e) => setFormData({...formData, porque_3: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>4º Por quê?</Label>
                  <Input value={formData.porque_4} onChange={(e) => setFormData({...formData, porque_4: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>5º Por quê?</Label>
                  <Input value={formData.porque_5} onChange={(e) => setFormData({...formData, porque_5: e.target.value})} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Causa Raiz Identificada</Label>
              <Textarea value={formData.causa_raiz_identificada} onChange={(e) => setFormData({...formData, causa_raiz_identificada: e.target.value})} rows={2} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Criar Análise</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
