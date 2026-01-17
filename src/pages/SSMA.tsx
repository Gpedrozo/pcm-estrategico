import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ShieldAlert, AlertTriangle, FileWarning, Calendar } from 'lucide-react';
import { useIncidentesSSMA, useCreateIncidenteSSMA, usePermissoesTrabalho, useCreatePermissaoTrabalho } from '@/hooks/useSSMA';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';

export default function SSMA() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('incidentes');
  const [isIncidenteModalOpen, setIsIncidenteModalOpen] = useState(false);
  const [isPTModalOpen, setIsPTModalOpen] = useState(false);

  const [incidenteForm, setIncidenteForm] = useState({
    tipo: 'QUASE_ACIDENTE' as 'ACIDENTE' | 'QUASE_ACIDENTE' | 'INCIDENTE_AMBIENTAL' | 'DESVIO',
    descricao: '',
    local_ocorrencia: '',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    severidade: 'MODERADO' as 'LEVE' | 'MODERADO' | 'GRAVE' | 'FATAL',
    pessoas_envolvidas: '',
    acoes_imediatas: '',
    dias_afastamento: 0,
  });

  const [ptForm, setPTForm] = useState({
    tipo: 'TRABALHO_QUENTE' as 'GERAL' | 'TRABALHO_ALTURA' | 'ESPACO_CONFINADO' | 'TRABALHO_QUENTE' | 'ELETRICA' | 'ESCAVACAO',
    descricao_servico: '',
    tag: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    executante_nome: '',
    supervisor_nome: user?.nome || '',
    riscos_identificados: '',
    medidas_controle: '',
    epis_requeridos: '',
  });

  const { data: incidentes, isLoading: loadingIncidentes } = useIncidentesSSMA();
  const { data: permissoes, isLoading: loadingPT } = usePermissoesTrabalho();
  const { data: equipamentos } = useEquipamentos();
  const createIncidente = useCreateIncidenteSSMA();
  const createPT = useCreatePermissaoTrabalho();

  const handleSubmitIncidente = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncidente.mutateAsync({
      ...incidenteForm,
      equipamento_id: null,
      tag: null,
      testemunhas: null,
      causas_imediatas: null,
      causas_basicas: null,
      custo_estimado: null,
      status: 'ABERTO',
      responsavel_id: user?.id || null,
      responsavel_nome: user?.nome || null,
    });
    setIsIncidenteModalOpen(false);
    setIncidenteForm({
      tipo: 'QUASE_ACIDENTE', descricao: '', local_ocorrencia: '',
      data_ocorrencia: new Date().toISOString().split('T')[0], severidade: 'MODERADO',
      pessoas_envolvidas: '', acoes_imediatas: '', dias_afastamento: 0
    });
  };

  const handleSubmitPT = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPT.mutateAsync({
      ...ptForm,
    });
    setIsPTModalOpen(false);
    setPTForm({
      tipo: 'TRABALHO_QUENTE', descricao_servico: '', tag: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0],
      executante_nome: '', supervisor_nome: user?.nome || '',
      riscos_identificados: '', medidas_controle: '', epis_requeridos: ''
    });
  };

  const getTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      'ACIDENTE': 'bg-destructive text-destructive-foreground',
      'QUASE_ACIDENTE': 'bg-warning text-warning-foreground',
      'INCIDENTE': 'bg-info/10 text-info',
      'DESVIO': 'bg-muted text-muted-foreground',
    };
    return styles[tipo] || '';
  };

  const getPTTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      'TRABALHO_QUENTE': 'bg-orange-500/10 text-orange-500',
      'ESPACO_CONFINADO': 'bg-red-500/10 text-red-500',
      'ALTURA': 'bg-blue-500/10 text-blue-500',
      'ELETRICA': 'bg-yellow-500/10 text-yellow-500',
      'ESCAVACAO': 'bg-amber-500/10 text-amber-500',
    };
    return styles[tipo] || '';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'ABERTO': 'bg-warning/10 text-warning',
      'EM_INVESTIGACAO': 'bg-info/10 text-info',
      'AGUARDANDO_ACOES': 'bg-primary/10 text-primary',
      'ENCERRADO': 'bg-success/10 text-success',
      'PENDENTE': 'bg-muted text-muted-foreground',
      'APROVADA': 'bg-success/10 text-success',
      'EM_EXECUCAO': 'bg-info/10 text-info',
      'CONCLUIDA': 'bg-primary/10 text-primary',
      'CANCELADA': 'bg-destructive/10 text-destructive',
    };
    return styles[status] || '';
  };

  const isLoading = loadingIncidentes || loadingPT;

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
          <h1 className="text-2xl font-bold text-foreground">SSMA - Saúde, Segurança e Meio Ambiente</h1>
          <p className="text-muted-foreground">Gestão de incidentes e permissões de trabalho</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">Acidentes (Ano)</p>
          </div>
          <p className="text-2xl font-bold text-destructive">{incidentes?.filter(i => i.tipo === 'ACIDENTE').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Quase Acidentes</p>
          </div>
          <p className="text-2xl font-bold text-warning">{incidentes?.filter(i => i.tipo === 'QUASE_ACIDENTE').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-info" />
            <p className="text-sm text-muted-foreground">Incidentes Abertos</p>
          </div>
          <p className="text-2xl font-bold text-info">{incidentes?.filter(i => i.status === 'ABERTO').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-success" />
            <p className="text-sm text-muted-foreground">PTs Vigentes</p>
          </div>
          <p className="text-2xl font-bold text-success">{permissoes?.filter(p => p.status === 'APROVADA' || p.status === 'EM_EXECUCAO').length || 0}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões de Trabalho</TabsTrigger>
          </TabsList>
          {activeTab === 'incidentes' ? (
            <Button onClick={() => setIsIncidenteModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Registrar Incidente
            </Button>
          ) : (
            <Button onClick={() => setIsPTModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Nova Permissão
            </Button>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <TabsContent value="incidentes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Local</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {incidentes?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum incidente registrado</td></tr>
                ) : (
                  incidentes?.map((inc) => (
                    <tr key={inc.id}>
                      <td className="font-mono font-medium">{inc.numero_incidente}</td>
                      <td><Badge className={getTipoBadge(inc.tipo)}>{inc.tipo?.replace('_', ' ')}</Badge></td>
                      <td className="max-w-[200px] truncate">{inc.descricao}</td>
                      <td>{inc.local_ocorrencia || '-'}</td>
                      <td><Badge variant={inc.severidade === 'GRAVE' || inc.severidade === 'FATAL' ? 'destructive' : 'secondary'}>{inc.severidade}</Badge></td>
                      <td><Badge className={getStatusBadge(inc.status)}>{inc.status?.replace('_', ' ')}</Badge></td>
                      <td>{new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="permissoes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Nº PT</th>
                  <th>Tipo</th>
                  <th>Serviço</th>
                  <th>Executante</th>
                  <th>Validade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {permissoes?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma permissão registrada</td></tr>
                ) : (
                  permissoes?.map((pt) => (
                    <tr key={pt.id}>
                      <td className="font-mono font-medium">{pt.numero_pt}</td>
                      <td><Badge className={getPTTipoBadge(pt.tipo)}>{pt.tipo?.replace('_', ' ')}</Badge></td>
                      <td className="max-w-[200px] truncate">{pt.descricao_servico}</td>
                      <td>{pt.executante_nome}</td>
                      <td>{new Date(pt.data_inicio).toLocaleDateString('pt-BR')} - {new Date(pt.data_fim).toLocaleDateString('pt-BR')}</td>
                      <td><Badge className={getStatusBadge(pt.status)}>{pt.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Incidente Modal */}
      <Dialog open={isIncidenteModalOpen} onOpenChange={setIsIncidenteModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Incidente</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitIncidente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={incidenteForm.tipo} onValueChange={(v: any) => setIncidenteForm({...incidenteForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACIDENTE">Acidente</SelectItem>
                    <SelectItem value="QUASE_ACIDENTE">Quase Acidente</SelectItem>
                    <SelectItem value="INCIDENTE_AMBIENTAL">Incidente Ambiental</SelectItem>
                    <SelectItem value="DESVIO">Desvio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={incidenteForm.severidade} onValueChange={(v: any) => setIncidenteForm({...incidenteForm, severidade: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEVE">Leve</SelectItem>
                    <SelectItem value="MODERADO">Moderado</SelectItem>
                    <SelectItem value="GRAVE">Grave</SelectItem>
                    <SelectItem value="FATAL">Fatal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Ocorrência</Label>
                <Input type="date" value={incidenteForm.data_ocorrencia} onChange={(e) => setIncidenteForm({...incidenteForm, data_ocorrencia: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={incidenteForm.local_ocorrencia} onChange={(e) => setIncidenteForm({...incidenteForm, local_ocorrencia: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={incidenteForm.descricao} onChange={(e) => setIncidenteForm({...incidenteForm, descricao: e.target.value})} rows={3} required />
            </div>
            <div className="space-y-2">
              <Label>Pessoas Envolvidas</Label>
              <Input value={incidenteForm.pessoas_envolvidas} onChange={(e) => setIncidenteForm({...incidenteForm, pessoas_envolvidas: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Ações Imediatas</Label>
              <Textarea value={incidenteForm.acoes_imediatas} onChange={(e) => setIncidenteForm({...incidenteForm, acoes_imediatas: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createIncidente.isPending}>Registrar</Button>
              <Button type="button" variant="outline" onClick={() => setIsIncidenteModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PT Modal */}
      <Dialog open={isPTModalOpen} onOpenChange={setIsPTModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Permissão de Trabalho</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitPT} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Trabalho *</Label>
                <Select value={ptForm.tipo} onValueChange={(v: any) => setPTForm({...ptForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GERAL">Geral</SelectItem>
                    <SelectItem value="TRABALHO_QUENTE">Trabalho a Quente</SelectItem>
                    <SelectItem value="ESPACO_CONFINADO">Espaço Confinado</SelectItem>
                    <SelectItem value="TRABALHO_ALTURA">Trabalho em Altura</SelectItem>
                    <SelectItem value="ELETRICA">Eletricidade</SelectItem>
                    <SelectItem value="ESCAVACAO">Escavação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TAG Equipamento</Label>
                <Select value={ptForm.tag} onValueChange={(v) => setPTForm({...ptForm, tag: v})}>
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
              <Label>Descrição do Serviço *</Label>
              <Textarea value={ptForm.descricao_servico} onChange={(e) => setPTForm({...ptForm, descricao_servico: e.target.value})} rows={2} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={ptForm.data_inicio} onChange={(e) => setPTForm({...ptForm, data_inicio: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={ptForm.data_fim} onChange={(e) => setPTForm({...ptForm, data_fim: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Executante *</Label>
                <Input value={ptForm.executante_nome} onChange={(e) => setPTForm({...ptForm, executante_nome: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Supervisor *</Label>
                <Input value={ptForm.supervisor_nome} onChange={(e) => setPTForm({...ptForm, supervisor_nome: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Riscos Identificados</Label>
              <Textarea value={ptForm.riscos_identificados} onChange={(e) => setPTForm({...ptForm, riscos_identificados: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Medidas de Controle</Label>
              <Textarea value={ptForm.medidas_controle} onChange={(e) => setPTForm({...ptForm, medidas_controle: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>EPIs Requeridos</Label>
              <Input value={ptForm.epis_requeridos} onChange={(e) => setPTForm({...ptForm, epis_requeridos: e.target.value})} placeholder="Ex: Capacete, luvas, óculos..." />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createPT.isPending}>Criar Permissão</Button>
              <Button type="button" variant="outline" onClick={() => setIsPTModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
