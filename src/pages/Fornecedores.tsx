import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Building2, Star, Phone, Mail } from 'lucide-react';
import { useFornecedores, useCreateFornecedor, type FornecedorRow } from '@/hooks/useFornecedores';

export default function Fornecedores() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    tipo: 'SERVICO' as 'SERVICO' | 'MATERIAL' | 'AMBOS',
    especialidade: '',
    telefone: '',
    email: '',
    contato_nome: '',
    endereco: '',
    observacoes: '',
  });

  const { data: fornecedores, isLoading } = useFornecedores();
  const createMutation = useCreateFornecedor();

  const filteredFornecedores = fornecedores?.filter(f => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return f.razao_social.toLowerCase().includes(searchLower) ||
           f.nome_fantasia?.toLowerCase().includes(searchLower) ||
           f.codigo.toLowerCase().includes(searchLower) ||
           f.especialidade?.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    setIsModalOpen(false);
    setFormData({
      codigo: '', razao_social: '', nome_fantasia: '', cnpj: '', tipo: 'SERVICO',
      especialidade: '', telefone: '', email: '', contato_nome: '', endereco: '', observacoes: ''
    });
  };

  const getTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      'SERVICO': 'bg-info/10 text-info',
      'MATERIAL': 'bg-success/10 text-success',
      'AMBOS': 'bg-primary/10 text-primary',
    };
    return styles[tipo] || '';
  };

  const renderStars = (rating: number | null) => {
    const stars = rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i <= stars ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="text-xs ml-1">({stars.toFixed(1)})</span>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">Cadastro e avaliação de fornecedores • {fornecedores?.length || 0} registros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <p className="text-2xl font-bold">{fornecedores?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-info">Serviços</p>
          <p className="text-2xl font-bold text-info">{fornecedores?.filter(f => f.tipo === 'SERVICO' || f.tipo === 'AMBOS').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-success">Materiais</p>
          <p className="text-2xl font-bold text-success">{fornecedores?.filter(f => f.tipo === 'MATERIAL' || f.tipo === 'AMBOS').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Ativos</p>
          <p className="text-2xl font-bold">{fornecedores?.filter(f => f.ativo).length || 0}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar fornecedores..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFornecedores.map((fornecedor) => (
          <div key={fornecedor.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-sm text-muted-foreground">{fornecedor.codigo}</p>
                <p className="font-semibold">{fornecedor.nome_fantasia || fornecedor.razao_social}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={getTipoBadge(fornecedor.tipo)}>{fornecedor.tipo}</Badge>
                <Badge variant={fornecedor.ativo ? 'default' : 'secondary'}>{fornecedor.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
            </div>
            
            {fornecedor.especialidade && (
              <p className="text-sm text-muted-foreground mb-2">{fornecedor.especialidade}</p>
            )}

            {renderStars(fornecedor.avaliacao_media)}

            <div className="mt-3 pt-3 border-t border-border space-y-1">
              {fornecedor.telefone && (
                <p className="text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {fornecedor.telefone}
                </p>
              )}
              {fornecedor.email && (
                <p className="text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {fornecedor.email}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICO">Serviço</SelectItem>
                    <SelectItem value="MATERIAL">Material</SelectItem>
                    <SelectItem value="AMBOS">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input value={formData.razao_social} onChange={(e) => setFormData({...formData, razao_social: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={formData.nome_fantasia} onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Especialidade</Label>
              <Input value={formData.especialidade} onChange={(e) => setFormData({...formData, especialidade: e.target.value})} placeholder="Ex: Manutenção elétrica, Caldeiraria..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={formData.contato_nome} onChange={(e) => setFormData({...formData, contato_nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} rows={2} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Cadastrar Fornecedor</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
