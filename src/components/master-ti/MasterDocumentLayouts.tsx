import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  FileText, Hash, RotateCcw, Settings, History, Eye, Save, Loader2, CheckCircle2
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

const OS_FIELDS = [
  { key: 'numero_os', label: 'Nº OS' },
  { key: 'tag', label: 'TAG' },
  { key: 'equipamento', label: 'Equipamento' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'status', label: 'Status' },
  { key: 'data_solicitacao', label: 'Data Solicitação' },
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'problema', label: 'Problema' },
  { key: 'tempo_estimado', label: 'Tempo Estimado' },
  { key: 'custo_estimado', label: 'Custo Estimado' },
  { key: 'modo_falha', label: 'Modo de Falha' },
  { key: 'causa_raiz', label: 'Causa Raiz' },
  { key: 'acao_corretiva', label: 'Ação Corretiva' },
];

const PR_FIELDS = [
  { key: 'codigo', label: 'Código' },
  { key: 'tag', label: 'TAG' },
  { key: 'nome', label: 'Nome do Plano' },
  { key: 'tipo_gatilho', label: 'Tipo Gatilho' },
  { key: 'frequencia_dias', label: 'Frequência' },
  { key: 'proxima_execucao', label: 'Próxima Execução' },
  { key: 'responsavel_nome', label: 'Responsável' },
  { key: 'especialidade', label: 'Especialidade' },
  { key: 'instrucoes', label: 'Instruções' },
  { key: 'atividades', label: 'Atividades' },
  { key: 'servicos', label: 'Serviços' },
];

const LAYOUT_OPTIONS = [
  { key: 'mostrar_logo', label: 'Logomarca da Empresa' },
  { key: 'mostrar_cnpj', label: 'CNPJ / Dados da Empresa' },
  { key: 'mostrar_assinaturas', label: 'Campos de Assinatura' },
  { key: 'mostrar_materiais', label: 'Seção de Materiais' },
  { key: 'mostrar_observacoes', label: 'Seção de Observações' },
  { key: 'mostrar_checklist', label: 'Checklist de Serviços' },
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

  const handleSaveLayout = async () => {
    if (!editingLayout) return;
    // Increment version
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

    // Deactivate old version
    await updateLayout.mutateAsync({ id: editingLayout.id, ativo: false });

    setEditingLayout(null);
    toast({ title: 'Layout salvo', description: `Nova versão ${newVersao} criada.` });
  };

  const getFieldsForType = (tipo: string) => {
    switch (tipo) {
      case 'ORDEM_SERVICO': return OS_FIELDS;
      case 'PREVENTIVA': return PR_FIELDS;
      default: return OS_FIELDS;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-bold">Gestão de Documentos & Layouts</h2>
          <p className="text-sm text-muted-foreground">Controle de numeração, campos visíveis e versões dos documentos</p>
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
            Controle automático de numeração sequencial de documentos. Cada tipo tem prefixo e sequência independentes.
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
            Configure campos visíveis, seções e opções de cada tipo de documento.
          </p>
          {loadLayouts ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {(layouts || []).filter(l => l.ativo).map(layout => {
                const docType = DOCUMENT_TYPES.find(d => d.key === layout.tipo_documento);
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
                      <div className="flex flex-wrap gap-1.5">
                        {(layout.configuracao?.campos_visiveis || []).map((field: string) => (
                          <Badge key={field} variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {getFieldsForType(layout.tipo_documento).find(f => f.key === field)?.label || field}
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
            Histórico de todas as versões de layout criadas.
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Layout — {editingLayout?.nome}</DialogTitle>
          </DialogHeader>

          {editingLayout && (
            <div className="space-y-6">
              {/* Fields */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Campos Visíveis</Label>
                <div className="grid grid-cols-2 gap-2">
                  {getFieldsForType(editingLayout.tipo_documento).map(field => (
                    <label key={field.key} className="flex items-center gap-2 p-2 border border-border rounded-md cursor-pointer hover:bg-muted/50">
                      <Switch
                        checked={(editConfig.campos_visiveis || []).includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                        className="scale-75"
                      />
                      <span className="text-sm">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Layout Options */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Seções do Documento</Label>
                <div className="space-y-2">
                  {LAYOUT_OPTIONS.map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-2 border border-border rounded-md">
                      <span className="text-sm">{opt.label}</span>
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
