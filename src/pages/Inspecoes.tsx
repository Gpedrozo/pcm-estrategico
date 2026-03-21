import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useInspecoes, useCreateInspecao, useUpdateInspecao, type InspecaoRow } from '@/hooks/useInspecoes';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useEquipamentos } from '@/hooks/useEquipamentos';

interface ChecklistItem {
  item: string;
  resposta: 'OK' | 'NOK' | 'NA';
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA';
}

interface OSPendingSuggestion {
  inspecaoId: string;
  rotaNome: string;
  tag: string;
  descricao: string;
}

const INSPECTION_MODELS: Record<string, ChecklistItem[]> = {
  DIARIA_OPERACIONAL: [
    { item: 'Ruído anormal em rolamentos', resposta: 'OK', criticidade: 'ALTA' },
    { item: 'Acúmulo de material no pé do elevador', resposta: 'OK', criticidade: 'MEDIA' },
    { item: 'Sensor de velocidade ativo', resposta: 'OK', criticidade: 'ALTA' },
    { item: 'Chave de emergência operacional', resposta: 'OK', criticidade: 'ALTA' },
  ],
  SEMANAL_MANUTENCAO: [
    { item: 'Temperatura do mancal dentro do limite', resposta: 'OK', criticidade: 'ALTA' },
    { item: 'Correia alinhada', resposta: 'OK', criticidade: 'ALTA' },
    { item: 'Parafusos das canecas sem folga', resposta: 'OK', criticidade: 'MEDIA' },
    { item: 'Funcionamento do esticador', resposta: 'OK', criticidade: 'MEDIA' },
  ],
  MENSAL_ESPECIALIZADA: [
    { item: 'Vibração global do conjunto dentro do limite', resposta: 'OK', criticidade: 'ALTA' },
    { item: 'Temperatura de mancais em regime', resposta: 'OK', criticidade: 'ALTA' },
    { item: 'Desgaste estrutural do tronco', resposta: 'OK', criticidade: 'MEDIA' },
    { item: 'Integridade de sensores de segurança', resposta: 'OK', criticidade: 'ALTA' },
  ],
};

export default function Inspecoes() {
  const { user } = useAuth();
  const { data: equipamentos } = useEquipamentos();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rotaTipoFilter, setRotaTipoFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInspecao, setSelectedInspecao] = useState<InspecaoRow | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INSPECTION_MODELS.DIARIA_OPERACIONAL);
  const [osSuggestion, setOsSuggestion] = useState<OSPendingSuggestion | null>(null);
  const [formData, setFormData] = useState({
    rota_nome: '',
    descricao: '',
    rota_tipo: 'DIARIA_OPERACIONAL',
    objetivo: 'Evitar parada de produção e detectar falhas cedo',
    tag: '',
    frequencia: 'DIARIA',
    turno: 'A',
    inspetor_nome: user?.nome || '',
  });

  const { data: inspecoes, isLoading } = useInspecoes();
  const createMutation = useCreateInspecao();
  const updateMutation = useUpdateInspecao();
  const createOSMutation = useCreateOrdemServico();

  const filteredInspecoes = useMemo(() => {
    return (inspecoes || []).filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;

      if (rotaTipoFilter !== 'all') {
        const descr = (i.descricao || '').toUpperCase();
        if (!descr.includes(`TIPO:${rotaTipoFilter}`)) return false;
      }

      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        i.rota_nome.toLowerCase().includes(searchLower) ||
        (i.inspetor_nome || '').toLowerCase().includes(searchLower)
      );
    });
  }, [inspecoes, statusFilter, rotaTipoFilter, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serializedChecklist = checklist.map((item) => `${item.item} => ${item.resposta} [${item.criticidade}]`).join(' | ');

    await createMutation.mutateAsync({
      rota_nome: formData.rota_nome,
      descricao: [
        `OBJETIVO:${formData.objetivo}`,
        `TIPO:${formData.rota_tipo}`,
        `FREQUENCIA:${formData.frequencia}`,
        `TAG:${formData.tag || 'GERAL'}`,
        `CHECKLIST:${serializedChecklist}`,
        formData.descricao ? `OBS:${formData.descricao}` : null,
      ].filter(Boolean).join('\n'),
      inspetor_id: user?.id,
      inspetor_nome: formData.inspetor_nome,
      hora_inicio: new Date().toTimeString().split(' ')[0].substring(0, 5),
    });
    setIsModalOpen(false);
    setFormData({
      rota_nome: '',
      descricao: '',
      rota_tipo: 'DIARIA_OPERACIONAL',
      objetivo: 'Evitar parada de produção e detectar falhas cedo',
      tag: '',
      frequencia: 'DIARIA',
      turno: 'A',
      inspetor_nome: user?.nome || '',
    });
    setChecklist(INSPECTION_MODELS.DIARIA_OPERACIONAL);
  };

  const handleConcluir = async (inspecao: InspecaoRow) => {
    const nokCount = checklist.filter((item) => item.resposta === 'NOK').length;

    await updateMutation.mutateAsync({
      id: inspecao.id,
      status: 'CONCLUIDA',
      hora_fim: new Date().toTimeString().split(' ')[0].substring(0, 5),
      anomalias_encontradas: nokCount,
    });

    if (nokCount > 0) {
      const tagFromDescricao = (inspecao.descricao || '').split('\n').find((line) => line.startsWith('TAG:'))?.replace('TAG:', '').trim() || '';
      setOsSuggestion({
        inspecaoId: inspecao.id,
        rotaNome: inspecao.rota_nome,
        tag: tagFromDescricao,
        descricao: `Inspeção concluída com ${nokCount} item(ns) NOK na rota ${inspecao.rota_nome}.`,
      });
    }
  };

  const handleConfirmOpenOS = async () => {
    if (!osSuggestion?.tag) {
      setOsSuggestion(null);
      return;
    }

    const equipamento = (equipamentos || []).find((item) => item.tag === osSuggestion.tag);
    if (!equipamento) {
      setOsSuggestion(null);
      return;
    }

    await createOSMutation.mutateAsync({
      tipo: 'INSPECAO',
      prioridade: 'ALTA',
      tag: osSuggestion.tag,
      equipamento: equipamento.nome,
      solicitante: 'Rota de Inspeção',
      problema: `${osSuggestion.descricao}\nInspeção: ${osSuggestion.inspecaoId}`,
      tempo_estimado: null,
      usuario_abertura: user?.id || null,
    });

    setOsSuggestion(null);
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
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">
      <div className="module-page-header flex items-center justify-between">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por rota, inspetor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="PLANEJADA">PLANEJADA</SelectItem>
              <SelectItem value="EM_ANDAMENTO">EM_ANDAMENTO</SelectItem>
              <SelectItem value="CONCLUIDA">CONCLUIDA</SelectItem>
              <SelectItem value="CANCELADA">CANCELADA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rotaTipoFilter} onValueChange={setRotaTipoFilter}>
            <SelectTrigger><SelectValue placeholder="Tipo de rota" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="DIARIA_OPERACIONAL">Diária Operacional</SelectItem>
              <SelectItem value="SEMANAL_MANUTENCAO">Semanal Manutenção</SelectItem>
              <SelectItem value="MENSAL_ESPECIALIZADA">Mensal Especializada</SelectItem>
            </SelectContent>
          </Select>
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
                        <Button size="sm" variant="outline" onClick={() => { setSelectedInspecao(insp); handleConcluir(insp); }}>
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
                <Label>Tipo de Rota</Label>
                <Select
                  value={formData.rota_tipo}
                  onValueChange={(v) => {
                    setFormData({ ...formData, rota_tipo: v });
                    setChecklist(INSPECTION_MODELS[v] || INSPECTION_MODELS.DIARIA_OPERACIONAL);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIARIA_OPERACIONAL">Diária Operacional</SelectItem>
                    <SelectItem value="SEMANAL_MANUTENCAO">Semanal Manutenção</SelectItem>
                    <SelectItem value="MENSAL_ESPECIALIZADA">Mensal Especializada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={formData.frequencia} onValueChange={(v) => setFormData({ ...formData, frequencia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIARIA">Diária</SelectItem>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAG do Ativo</Label>
                <Select value={formData.tag || 'geral'} onValueChange={(v) => setFormData({ ...formData, tag: v === 'geral' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    {(equipamentos || []).filter((e) => e.ativo).map((e) => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag} - {e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Objetivo da Rota</Label>
                <Input value={formData.objetivo} onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })} />
              </div>
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
            <div className="space-y-2">
              <Label>Checklist Padrão</Label>
              <div className="space-y-2 rounded-md border border-border p-3">
                {checklist.map((item, idx) => (
                  <div key={`${item.item}-${idx}`} className="grid grid-cols-12 gap-2 items-center">
                    <p className="col-span-6 text-sm">{item.item}</p>
                    <Select
                      value={item.resposta}
                      onValueChange={(v: 'OK' | 'NOK' | 'NA') => {
                        setChecklist((prev) => prev.map((it, i) => (i === idx ? { ...it, resposta: v } : it)));
                      }}
                    >
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OK">OK</SelectItem>
                        <SelectItem value="NOK">NOK</SelectItem>
                        <SelectItem value="NA">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={item.criticidade}
                      onValueChange={(v: 'BAIXA' | 'MEDIA' | 'ALTA') => {
                        setChecklist((prev) => prev.map((it, i) => (i === idx ? { ...it, criticidade: v } : it)));
                      }}
                    >
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAIXA">Baixa</SelectItem>
                        <SelectItem value="MEDIA">Média</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Iniciar Inspeção</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!osSuggestion} onOpenChange={(open) => !open && setOsSuggestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sugestão de abertura de O.S</AlertDialogTitle>
            <AlertDialogDescription>
              Foram detectadas anomalias/NOK na inspeção. Deseja abrir uma O.S pré-preenchida para tratamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p><strong>Rota:</strong> {osSuggestion?.rotaNome}</p>
            <p><strong>TAG:</strong> {osSuggestion?.tag || 'Não informada'}</p>
            <p><strong>Resumo:</strong> {osSuggestion?.descricao}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOpenOS} disabled={createOSMutation.isPending || !osSuggestion?.tag}>
              {createOSMutation.isPending ? 'Abrindo...' : 'Abrir O.S sugerida'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
