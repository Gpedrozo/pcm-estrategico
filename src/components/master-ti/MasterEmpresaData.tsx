import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Building2, AlertTriangle, MessageSquareDiff } from 'lucide-react';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useCreateSupportTicket } from '@/hooks/useSupportTickets';
import { useToast } from '@/hooks/use-toast';

// --- Field definitions -------------------------------------------------------

const FIELD_GROUPS = [
  {
    group: 'Dados Cadastrais',
    fields: [
      { label: 'Razão Social',        key: 'razao_social'        },
      { label: 'Nome Fantasia',        key: 'nome_fantasia'       },
      { label: 'CNPJ',                 key: 'cnpj'                },
      { label: 'Inscrição Estadual',   key: 'inscricao_estadual'  },
    ],
  },
  {
    group: 'Endereço',
    fields: [
      { label: 'Endereço',  key: 'endereco' },
      { label: 'Cidade',    key: 'cidade'   },
      { label: 'Estado',    key: 'estado'   },
      { label: 'CEP',       key: 'cep'      },
    ],
  },
  {
    group: 'Contato',
    fields: [
      { label: 'Telefone',  key: 'telefone' },
      { label: 'WhatsApp',  key: 'whatsapp' },
      { label: 'E-mail',    key: 'email'    },
      { label: 'Site',      key: 'site'     },
    ],
  },
  {
    group: 'Responsável Técnico',
    fields: [
      { label: 'Nome',  key: 'responsavel_nome'  },
      { label: 'Cargo', key: 'responsavel_cargo' },
    ],
  },
] as const;

const ALL_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);
type FieldKey = typeof ALL_FIELDS[number]['key'];

// --- Helper ------------------------------------------------------------------

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value ? (
        <p className="text-sm font-medium">{value}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground/50">Não informado</p>
      )}
    </div>
  );
}

// --- Main component ----------------------------------------------------------
export function MasterEmpresaData() {
  const { data: empresa, isLoading } = useDadosEmpresa();
  const createTicket = useCreateSupportTicket();
  const { toast } = useToast();

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [selectedField, setSelectedField] = useState<FieldKey | ''>('');
  const [correctValue,  setCorrectValue]  = useState('');
  const [justification, setJustification] = useState('');

  const handleSendRequest = async () => {
    if (!selectedField || !correctValue.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o campo e informe o valor correto.',
        variant: 'destructive',
      });
      return;
    }

    const fieldLabel   = ALL_FIELDS.find(f => f.key === selectedField)?.label ?? selectedField;
    const currentValue = empresa
      ? ((empresa[selectedField as keyof typeof empresa] as string | null) ?? 'Não informado')
      : 'Não informado';

    const subject = `Solicitação de correção cadastral — ${fieldLabel}`;
    const message = [
      `Campo: ${fieldLabel}`,
      `Valor atual: ${currentValue}`,
      `Valor solicitado: ${correctValue.trim()}`,
      justification.trim() ? `Justificativa: ${justification.trim()}` : '',
    ].filter(Boolean).join('\n');

    try {
      await createTicket.mutateAsync({ subject, message, priority: 'normal' });
      toast({
        title: 'Chamado enviado!',
        description: 'Sua solicitação foi enviada ao Owner para análise.',
      });
      setDialogOpen(false);
      setSelectedField('');
      setCorrectValue('');
      setJustification('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar chamado', description: errorMsg, variant: 'destructive' });
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <Building2 className="h-14 w-14 mx-auto text-muted-foreground/30" />
          <h3 className="text-lg font-semibold">Cadastro pendente</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Os dados desta empresa ainda não foram cadastrados pelo Owner.
            Aguarde o cadastro ser realizado no painel Owner.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Dados da Empresa</h2>
            <p className="text-sm text-muted-foreground">
              Visualização somente leitura. Para corrigir algum dado, utilize "Solicitar Correção".
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <MessageSquareDiff className="h-4 w-4" />
              Solicitar Correção
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Solicitar Correção de Dado Cadastral
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6" style={{ maxHeight: '60vh' }}>
              <div
                className="space-y-4 overflow-y-auto pr-3 border-r border-border"
                style={{ maxHeight: '55vh' }}
              >
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 bg-background pb-1">
                  Dados Atuais
                </p>
                {ALL_FIELDS.map(f => (
                  <FieldRow
                    key={f.key}
                    label={f.label}
                    value={empresa[f.key as keyof typeof empresa] as string | null}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Correção Solicitada
                </p>

                <div className="space-y-1.5">
                  <Label>Campo a corrigir *</Label>
                  <Select
                    value={selectedField}
                    onValueChange={(v) => setSelectedField(v as FieldKey)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o campo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_FIELDS.map(f => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Valor correto *</Label>
                  <Textarea
                    placeholder="Informe o valor correto..."
                    value={correctValue}
                    onChange={(e) => setCorrectValue(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Justificativa{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    placeholder="Motivo da correção..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendRequest}
                disabled={createTicket.isPending}
                className="gap-2"
              >
                {createTicket.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <MessageSquareDiff className="h-4 w-4" />}
                Enviar Chamado ao Owner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {FIELD_GROUPS.map(group => (
          <Card key={group.group}>
            <CardHeader>
              <CardTitle className="text-base">{group.group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map(f => (
                <FieldRow
                  key={f.key}
                  label={f.label}
                  value={empresa[f.key as keyof typeof empresa] as string | null}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

