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
import { Plus, Search, Activity, Thermometer, Gauge, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MedicaoPreditiva {
  id: string;
  tag: string;
  tipo_medicao: string;
  valor: number;
  unidade: string;
  limite_alerta: number | null;
  limite_critico: number | null;
  status: string;
  observacoes: string | null;
  responsavel_nome: string | null;
  created_at: string;
}

const useMedicoesPreditivas = () => {
  return useQuery({
    queryKey: ['medicoes_preditivas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MedicaoPreditiva[];
    },
  });
};

const useCreateMedicao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { tag: string; tipo_medicao: string; valor: number; unidade: string; status: string; limite_alerta?: number; limite_critico?: number; observacoes?: string; responsavel_nome?: string }) => {
      const { data: result, error } = await supabase
        .from('medicoes_preditivas')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas'] });
      toast({ title: 'Medição registrada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao registrar medição', variant: 'destructive' });
    },
  });
};

export default function Preditiva() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('medicoes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tag: '',
    tipo_medicao: 'VIBRACAO',
    valor: 0,
    unidade: 'mm/s',
    limite_alerta: 0,
    limite_critico: 0,
    observacoes: '',
  });

  const { data: medicoes, isLoading } = useMedicoesPreditivas();
  const { data: equipamentos } = useEquipamentos();
  const createMutation = useCreateMedicao();

  const filteredMedicoes = medicoes?.filter(m => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return m.tag.toLowerCase().includes(searchLower) ||
           m.tipo_medicao.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine status based on value and limits
    let status = 'NORMAL';
    if (formData.limite_critico && formData.valor >= formData.limite_critico) {
      status = 'CRITICO';
    } else if (formData.limite_alerta && formData.valor >= formData.limite_alerta) {
      status = 'ALERTA';
    }
    
    await createMutation.mutateAsync({
      ...formData,
      status,
      responsavel_nome: user?.nome,
    });
    setIsModalOpen(false);
    setFormData({
      tag: '', tipo_medicao: 'VIBRACAO', valor: 0, unidade: 'mm/s',
      limite_alerta: 0, limite_critico: 0, observacoes: ''
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'VIBRACAO': return <Activity className="h-4 w-4" />;
      case 'TEMPERATURA': return <Thermometer className="h-4 w-4" />;
      case 'PRESSAO': return <Gauge className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-success/10 text-success';
      case 'ALERTA': return 'bg-warning/10 text-warning';
      case 'CRITICO': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Stats
  const stats = {
    total: medicoes?.length || 0,
    normal: medicoes?.filter(m => m.status === 'NORMAL').length || 0,
    alerta: medicoes?.filter(m => m.status === 'ALERTA').length || 0,
    critico: medicoes?.filter(m => m.status === 'CRITICO').length || 0,
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
          <h1 className="text-2xl font-bold text-foreground">Manutenção Preditiva</h1>
          <p className="text-muted-foreground">Monitoramento de condição e análise de tendências</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Medição
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Medições</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-sm text-success">Normal</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.normal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">Alerta</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.alerta}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">Crítico</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.critico}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="medicoes">Medições</TabsTrigger>
          <TabsTrigger value="tendencias">Tendências</TabsTrigger>
          <TabsTrigger value="alertas">Alertas Ativos</TabsTrigger>
        </TabsList>

        <div className="bg-card border border-border rounded-lg p-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por TAG, tipo..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
        </div>

        <TabsContent value="medicoes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>TAG</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Limite Alerta</th>
                  <th>Limite Crítico</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicoes.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma medição encontrada</td></tr>
                ) : (
                  filteredMedicoes.map((med) => (
                    <tr key={med.id}>
                      <td className="font-mono text-primary font-medium">{med.tag}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getTipoIcon(med.tipo_medicao)}
                          {med.tipo_medicao}
                        </div>
                      </td>
                      <td className="font-bold">{med.valor} {med.unidade}</td>
                      <td>{med.limite_alerta || '-'} {med.limite_alerta ? med.unidade : ''}</td>
                      <td>{med.limite_critico || '-'} {med.limite_critico ? med.unidade : ''}</td>
                      <td><Badge className={getStatusBadge(med.status)}>{med.status}</Badge></td>
                      <td>{med.responsavel_nome || '-'}</td>
                      <td>{new Date(med.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tendencias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gráficos de tendência serão exibidos aqui</p>
                <p className="text-sm">Selecione um equipamento para visualizar o histórico de medições</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <div className="space-y-4">
            {medicoes?.filter(m => m.status === 'ALERTA' || m.status === 'CRITICO').map(med => (
              <Card key={med.id} className={med.status === 'CRITICO' ? 'border-destructive' : 'border-warning'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${med.status === 'CRITICO' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                        {getTipoIcon(med.tipo_medicao)}
                      </div>
                      <div>
                        <p className="font-mono text-primary font-bold">{med.tag}</p>
                        <p className="text-sm text-muted-foreground">{med.tipo_medicao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{med.valor} {med.unidade}</p>
                      <Badge className={getStatusBadge(med.status)}>{med.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {medicoes?.filter(m => m.status === 'ALERTA' || m.status === 'CRITICO').length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-lg">Nenhum alerta ativo</p>
                <p className="text-sm">Todos os equipamentos monitorados estão em condições normais</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Medição Preditiva</DialogTitle></DialogHeader>
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
                <Label>Tipo de Medição *</Label>
                <Select value={formData.tipo_medicao} onValueChange={(v) => setFormData({...formData, tipo_medicao: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIBRACAO">Vibração</SelectItem>
                    <SelectItem value="TEMPERATURA">Temperatura</SelectItem>
                    <SelectItem value="PRESSAO">Pressão</SelectItem>
                    <SelectItem value="CORRENTE">Corrente Elétrica</SelectItem>
                    <SelectItem value="ULTRASSOM">Ultrassom</SelectItem>
                    <SelectItem value="TERMOGRAFIA">Termografia</SelectItem>
                    <SelectItem value="ANALISE_OLEO">Análise de Óleo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Medido *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.valor} 
                  onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value) || 0})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={formData.unidade} onValueChange={(v) => setFormData({...formData, unidade: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm/s">mm/s (Vibração)</SelectItem>
                    <SelectItem value="°C">°C (Temperatura)</SelectItem>
                    <SelectItem value="bar">bar (Pressão)</SelectItem>
                    <SelectItem value="A">A (Corrente)</SelectItem>
                    <SelectItem value="dB">dB (Ultrassom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite de Alerta</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.limite_alerta} 
                  onChange={(e) => setFormData({...formData, limite_alerta: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Crítico</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.limite_critico} 
                  onChange={(e) => setFormData({...formData, limite_critico: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={formData.observacoes} 
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                Registrar Medição
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