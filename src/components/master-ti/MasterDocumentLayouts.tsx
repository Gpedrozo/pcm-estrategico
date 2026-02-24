import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  FileText, Hash, RotateCcw, Settings, History, Save, Loader2, CheckCircle2,
  Eye, EyeOff, GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  useDocumentSequences, useResetSequence,
  useDocumentLayouts, useCreateLayout, useUpdateLayout,
  type DocumentLayout,
} from '@/hooks/useDocumentEngine';
import { useToast } from '@/hooks/use-toast';

const DOCUMENT_TYPES = [
  { key: 'ORDEM_SERVICO', label: 'Ordem de Serviço', color: 'bg-info/10 text-info' },
  { key: 'PREVENTIVA', label: 'Preventiva', color: 'bg-success/10 text-success' },
  { key: 'LUBRIFICACAO', label: 'Lubrificação', color: 'bg-warning/10 text-warning' },
  { key: 'INSPECAO', label: 'Inspeção', color: 'bg-primary/10 text-primary' },
  { key: 'RELATORIO', label: 'Relatório', color: 'bg-destructive/10 text-destructive' },
];

const FIELDS_BY_TYPE: Record<string, { key: string; label: string; category: string }[]> = {
  ORDEM_SERVICO: [
    { key: 'numero_os', label: 'Nº OS', category: 'Identificação' },
    { key: 'tag', label: 'TAG', category: 'Identificação' },
    { key: 'equipamento', label: 'Equipamento', category: 'Identificação' },
    { key: 'tipo', label: 'Tipo', category: 'Classificação' },
    { key: 'prioridade', label: 'Prioridade', category: 'Classificação' },
    { key: 'status', label: 'Status', category: 'Classificação' },
    { key: 'data_solicitacao', label: 'Data Solicitação', category: 'Datas' },
    { key: 'solicitante', label: 'Solicitante', category: 'Responsáveis' },
    { key: 'problema', label: 'Problema', category: 'Descrição' },
    { key: 'tempo_estimado', label: 'Tempo Estimado', category: 'Operacional' },
    { key: 'custo_estimado', label: 'Custo Estimado', category: 'Financeiro' },
    { key: 'modo_falha', label: 'Modo de Falha', category: 'Análise' },
    { key: 'causa_raiz', label: 'Causa Raiz', category: 'Análise' },
    { key: 'acao_corretiva', label: 'Ação Corretiva', category: 'Análise' },
    { key: 'setor', label: 'Setor', category: 'Localização' },
  ],
  PREVENTIVA: [
    { key: 'codigo', label: 'Código', category: 'Identificação' },
    { key: 'tag', label: 'TAG', category: 'Identificação' },
    { key: 'nome', label: 'Nome do Plano', category: 'Identificação' },
    { key: 'tipo_gatilho', label: 'Tipo Gatilho', category: 'Classificação' },
    { key: 'frequencia_dias', label: 'Frequência', category: 'Programação' },
    { key: 'proxima_execucao', label: 'Próxima Execução', category: 'Programação' },
    { key: 'responsavel_nome', label: 'Responsável', category: 'Responsáveis' },
    { key: 'especialidade', label: 'Especialidade', category: 'Classificação' },
    { key: 'instrucoes', label: 'Instruções', category: 'Descrição' },
    { key: 'atividades', label: 'Atividades', category: 'Operacional' },
    { key: 'servicos', label: 'Serviços', category: 'Operacional' },
    { key: 'materiais_previstos', label: 'Materiais Previstos', category: 'Operacional' },
  ],
  INSPECAO: [
    { key: 'numero_inspecao', label: 'Nº Inspeção', category: 'Identificação' },
    { key: 'rota_nome', label: 'Rota', category: 'Identificação' },
    { key: 'inspetor_nome', label: 'Inspetor', category: 'Responsáveis' },
    { key: 'data_inspecao', label: 'Data', category: 'Datas' },
    { key: 'turno', label: 'Turno', category: 'Classificação' },
    { key: 'status', label: 'Status', category: 'Classificação' },
    { key: 'anomalias_encontradas', label: 'Anomalias', category: 'Operacional' },
    { key: 'observacoes', label: 'Observações', category: 'Descrição' },
  ],
  LUBRIFICACAO: [
    { key: 'codigo', label: 'Código', category: 'Identificação' },
    { key: 'tag', label: 'TAG', category: 'Identificação' },
    { key: 'tipo_lubrificante', label: 'Lubrificante', category: 'Operacional' },
    { key: 'quantidade', label: 'Quantidade', category: 'Operacional' },
    { key: 'frequencia', label: 'Frequência', category: 'Programação' },
    { key: 'responsavel', label: 'Responsável', category: 'Responsáveis' },
  ],
  RELATORIO: [
    { key: 'numero_os', label: 'Nº OS', category: 'Identificação' },
    { key: 'tag', label: 'TAG', category: 'Identificação' },
    { key: 'equipamento', label: 'Equipamento', category: 'Identificação' },
    { key: 'tipo', label: 'Tipo', category: 'Classificação' },
    { key: 'prioridade', label: 'Prioridade', category: 'Classificação' },
    { key: 'status', label: 'Status', category: 'Classificação' },
    { key: 'data_solicitacao', label: 'Data', category: 'Datas' },
    { key: 'solicitante', label: 'Solicitante', category: 'Responsáveis' },
    { key: 'custo_estimado', label: 'Custo', category: 'Financeiro' },
  ],
};

const SECTION_OPTIONS = [
  { key: 'mostrar_logo', label: 'Logomarca da Empresa', description: 'Exibir logo no cabeçalho' },
  { key: 'mostrar_cnpj', label: 'CNPJ / Dados da Empresa', description: 'Exibir CNPJ e contato abaixo do cabeçalho' },
  { key: 'mostrar_assinaturas', label: 'Campos de Assinatura', description: 'Áreas para assinatura no rodapé' },
  { key: 'mostrar_materiais', label: 'Seção de Materiais', description: 'Tabela de peças e materiais' },
  { key: 'mostrar_observacoes', label: 'Seção de Observações', description: 'Campo de observações livres' },
  { key: 'mostrar_checklist', label: 'Checklist de Serviços', description: 'Lista de serviços com checkboxes' },
  { key: 'mostrar_executor', label: 'Blocos de Executor', description: 'Campos para nome e assinatura do executor' },
  { key: 'mostrar_horarios', label: 'Horários de Execução', description: 'Hora início, fim e tempo total' },
  { key: 'mostrar_status_final', label: 'Status Final', description: 'Checkboxes serviço finalizado/equipamento liberado' },
];

export function MasterDocumentLayouts() {
  const [tab, setTab] = useState('sequences');
  const [editingLayout, setEditingLayout] = useState<DocumentLayout | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, any>>({});
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  const { data: sequences, isLoading: loadSeq } = useDocumentSequences();
  const { data: layouts, isLoading: loadLayouts } = useDocumentLayouts();
  const resetSequence = useResetSequence();
  const createLayout = useCreateLayout();
  const updateLayout = useUpdateLayout();
  const { toast } = useToast();

  const handleResetSequence = async (tipo: string) => {
    await resetSequence.mutateAsync(tipo);
    setConfirmReset(null);
  };

  const handleEditLayout = (layout: DocumentLayout) => {
    setEditingLayout(layout);
    setEditConfig(layout.configuracao || {});
  };

  const toggleField = (field: string) => {
    const current = editConfig.campos_visiveis || [];
    const updated = current.includes(field)
      ? current.filter((f: string) => f !== field)
      : [...current, field];
    setEditConfig({ ...editConfig, campos_visiveis: updated });
  };

  const toggleOption = (key: string) => {
    setEditConfig({ ...editConfig, [key]: !editConfig[key] });
  };

  const moveField = (field: string, direction: 'up' | 'down') => {
    const current = editConfig.campos_visiveis || [];
    const idx = current.indexOf(field);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= current.length) return;
    const updated = [...current];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setEditConfig({ ...editConfig, campos_visiveis: updated });
  };

  const handleSaveLayout = async () => {
    if (!editingLayout) return;
    const parts = editingLayout.versao.split('.');
    const newMinor = parseInt(parts[1] || '0') + 1;
    const newVersao = `${parts[0]}.${newMinor}`;

    await createLayout.mutateAsync({
      tipo_documento: editingLayout.tipo_documento,
      versao: newVersao,
      nome: editingLayout.nome,
      configuracao: editConfig,
      ativo: true,
      autor_nome: 'Master TI',
    });

    await updateLayout.mutateAsync({ id: editingLayout.id, ativo: false });
    setEditingLayout(null);
    toast({ title: 'Layout salvo', description: `Nova versão ${newVersao} criada.` });
  };

  const getFieldsForType = (tipo: string) => FIELDS_BY_TYPE[tipo] || FIELDS_BY_TYPE.ORDEM_SERVICO;

  const groupedFields = (tipo: string) => {
    const fields = getFieldsForType(tipo);
    const groups: Record<string, typeof fields> = {};
    for (const f of fields) {
      (groups[f.category] = groups[f.category] || []).push(f);
    }
    return groups;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-bold">Gestão de Documentos & Layouts</h2>
          <p className="text-sm text-muted-foreground">Controle numeração, campos visíveis, seções e versões dos documentos</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sequences" className="gap-1.5"><Hash className="h-3.5 w-3.5" />Numeração</TabsTrigger>
          <TabsTrigger value="layouts" className="gap-1.5"><Settings className="h-3.5 w-3.5" />Layouts</TabsTrigger>
          <TabsTrigger value="versions" className="gap-1.5"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
        </TabsList>

        {/* NUMERAÇÃO */}
        <TabsContent value="sequences" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Controle automático de numeração sequencial. Cada tipo de documento possui prefixo e sequência independentes.
          </p>
          {loadSeq ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sequences || []).map(seq => {
                const docType = DOCUMENT_TYPES.find(d => d.key === seq.tipo_documento);
                return (
                  <Card key={seq.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={docType?.color || ''}>{docType?.label || seq.tipo_documento}</Badge>
                      </div>
                      <div className="text-center my-4">
                        <p className="text-3xl font-mono font-black text-primary">
                          {seq.prefixo}-{String(seq.ultimo_numero).padStart(6, '0')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Último número emitido</p>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Próximo: {seq.prefixo}-{String(seq.ultimo_numero + 1).padStart(6, '0')}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive gap-1" onClick={() => setConfirmReset(seq.tipo_documento)}>
                          <RotateCcw className="h-3 w-3" /> Reiniciar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* LAYOUTS */}
        <TabsContent value="layouts" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure campos visíveis, ordem das colunas e seções de cada tipo de documento.
          </p>
          {loadLayouts ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {(layouts || []).filter(l => l.ativo).map(layout => {
                const docType = DOCUMENT_TYPES.find(d => d.key === layout.tipo_documento);
                const visibleFields = layout.configuracao?.campos_visiveis || [];
                const allFields = getFieldsForType(layout.tipo_documento);
                return (
                  <Card key={layout.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={docType?.color || ''}>{docType?.label || layout.tipo_documento}</Badge>
                          <CardTitle className="text-base">{layout.nome}</CardTitle>
                          <Badge variant="outline" className="text-xs">v{layout.versao}</Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleEditLayout(layout)}>
                          <Settings className="h-3.5 w-3.5 mr-1" /> Configurar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">
                          {visibleFields.length} de {allFields.length} campos visíveis
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleFields.map((field: string) => (
                          <Badge key={field} variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {allFields.find(f => f.key === field)?.label || field}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="versions" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Histórico completo de todas as versões de layout criadas, com autor e data.
          </p>
          {(layouts || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(layout => {
            const docType = DOCUMENT_TYPES.find(d => d.key === layout.tipo_documento);
            return (
              <div key={layout.id} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                <Badge className={docType?.color || ''} variant="secondary">{docType?.label || layout.tipo_documento}</Badge>
                <span className="font-mono text-sm font-bold">v{layout.versao}</span>
                <span className="text-sm">{layout.nome}</span>
                <Badge variant={layout.ativo ? 'default' : 'outline'} className="text-[10px]">
                  {layout.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                {layout.autor_nome && <span className="text-xs text-muted-foreground">por {layout.autor_nome}</span>}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(layout.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Reset Confirmation */}
      <Dialog open={!!confirmReset} onOpenChange={() => setConfirmReset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reiniciar Numeração</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja reiniciar a numeração de <strong>{confirmReset}</strong>? O próximo documento será emitido com número 000001.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmReset && handleResetSequence(confirmReset)} disabled={resetSequence.isPending}>
              {resetSequence.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Reiniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Layout */}
      <Dialog open={!!editingLayout} onOpenChange={() => setEditingLayout(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Layout — {editingLayout?.nome}
            </DialogTitle>
          </DialogHeader>

          {editingLayout && (
            <div className="space-y-6">
              {/* Fields by Category */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Campos Visíveis no Documento</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione quais campos aparecem no documento impresso. Use as setas para reordenar.
                </p>

                {Object.entries(groupedFields(editingLayout.tipo_documento)).map(([category, fields]) => (
                  <div key={category} className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
                    <div className="space-y-1">
                      {fields.map(field => {
                        const isVisible = (editConfig.campos_visiveis || []).includes(field.key);
                        const idx = (editConfig.campos_visiveis || []).indexOf(field.key);
                        return (
                          <div key={field.key} className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${isVisible ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                            <Switch
                              checked={isVisible}
                              onCheckedChange={() => toggleField(field.key)}
                              className="scale-75"
                            />
                            <span className="text-sm flex-1">{field.label}</span>
                            {isVisible && (
                              <div className="flex gap-0.5">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveField(field.key, 'up')} disabled={idx <= 0}>
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveField(field.key, 'down')} disabled={idx >= (editConfig.campos_visiveis || []).length - 1}>
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {isVisible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Section Options */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Seções do Documento</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Ative ou desative seções inteiras do documento impresso.
                </p>
                <div className="space-y-2">
                  {SECTION_OPTIONS.map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-2 border border-border rounded-md">
                      <div>
                        <span className="text-sm font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                      <Switch
                        checked={editConfig[opt.key] !== false}
                        onCheckedChange={() => toggleOption(opt.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLayout(null)}>Cancelar</Button>
            <Button onClick={handleSaveLayout} disabled={createLayout.isPending} className="gap-1.5">
              {createLayout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Nova Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
