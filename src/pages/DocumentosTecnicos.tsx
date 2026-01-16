import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  FileText, 
  File, 
  FileImage, 
  Download, 
  Eye,
  Calendar,
  User,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocumentoTecnico {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  tag: string | null;
  descricao: string | null;
  versao: string;
  status: string;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  data_validade: string | null;
  aprovador_nome: string | null;
  created_at: string;
  updated_at: string;
}

const useDocumentos = () => {
  return useQuery({
    queryKey: ['documentos_tecnicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DocumentoTecnico[];
    },
  });
};

const useCreateDocumento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { codigo: string; titulo: string; tipo: string; tag?: string; descricao?: string; versao?: string; status?: string }) => {
      const { data: result, error } = await supabase
        .from('documentos_tecnicos')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({ title: 'Documento cadastrado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao cadastrar documento', variant: 'destructive' });
    },
  });
};

export default function DocumentosTecnicos() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    titulo: '',
    tipo: 'POP',
    tag: '',
    descricao: '',
    versao: '1.0',
  });

  const { data: documentos, isLoading } = useDocumentos();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreateDocumento();

  const filteredDocumentos = documentos?.filter(doc => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return doc.codigo.toLowerCase().includes(searchLower) ||
           doc.titulo.toLowerCase().includes(searchLower) ||
           doc.tag?.toLowerCase().includes(searchLower);
  }).filter(doc => {
    if (activeTab === 'todos') return true;
    return doc.tipo === activeTab;
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      status: 'RASCUNHO',
    });
    setIsModalOpen(false);
    setFormData({
      codigo: '', titulo: '', tipo: 'POP', tag: '', descricao: '', versao: '1.0'
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'POP': return <FileText className="h-5 w-5 text-primary" />;
      case 'MANUAL': return <File className="h-5 w-5 text-info" />;
      case 'DESENHO': return <FileImage className="h-5 w-5 text-warning" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO': return 'bg-success/10 text-success';
      case 'EM_REVISAO': return 'bg-warning/10 text-warning';
      case 'RASCUNHO': return 'bg-muted text-muted-foreground';
      case 'OBSOLETO': return 'bg-destructive/10 text-destructive';
      default: return '';
    }
  };

  // Stats
  const stats = {
    total: documentos?.length || 0,
    aprovados: documentos?.filter(d => d.status === 'APROVADO').length || 0,
    emRevisao: documentos?.filter(d => d.status === 'EM_REVISAO').length || 0,
    vencidos: documentos?.filter(d => d.data_validade && new Date(d.data_validade) < new Date()).length || 0,
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
          <h1 className="text-2xl font-bold text-foreground">Documentação Técnica</h1>
          <p className="text-muted-foreground">POPs, manuais, desenhos e procedimentos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm text-success">Aprovados</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.aprovados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">Em Revisão</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.emRevisao}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">Vencidos</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.vencidos}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="POP">POPs</TabsTrigger>
            <TabsTrigger value="MANUAL">Manuais</TabsTrigger>
            <TabsTrigger value="DESENHO">Desenhos</TabsTrigger>
            <TabsTrigger value="INSTRUCAO">Instruções</TabsTrigger>
          </TabsList>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código, título, TAG..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocumentos.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhum documento encontrado</p>
              </div>
            ) : (
              filteredDocumentos.map((doc) => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {getTipoIcon(doc.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-primary">{doc.codigo}</span>
                          <Badge className={getStatusBadge(doc.status)}>{doc.status}</Badge>
                        </div>
                        <h3 className="font-semibold truncate">{doc.titulo}</h3>
                        <p className="text-sm text-muted-foreground truncate">{doc.descricao || 'Sem descrição'}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {doc.tag || 'Geral'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          v{doc.versao}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Eye className="h-3 w-3" />
                        Visualizar
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Documento Técnico</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input 
                  value={formData.codigo} 
                  onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})} 
                  placeholder="Ex: POP-MAN-001"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POP">POP - Procedimento Operacional</SelectItem>
                    <SelectItem value="MANUAL">Manual Técnico</SelectItem>
                    <SelectItem value="DESENHO">Desenho / Esquema</SelectItem>
                    <SelectItem value="INSTRUCAO">Instrução de Trabalho</SelectItem>
                    <SelectItem value="CATALOGO">Catálogo de Peças</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input 
                value={formData.titulo} 
                onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAG do Equipamento</Label>
                <Select value={formData.tag} onValueChange={(v) => setFormData({...formData, tag: v})}>
                  <SelectTrigger><SelectValue placeholder="Geral" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Geral</SelectItem>
                    {equipamentos?.filter(e => e.ativo).map(e => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Versão</Label>
                <Input 
                  value={formData.versao} 
                  onChange={(e) => setFormData({...formData, versao: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.descricao} 
                onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                rows={3}
                placeholder="Breve descrição do documento..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                Cadastrar Documento
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}