import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Loader2, Save, ShieldAlert, MapPin, Phone, UserCheck, Gavel, Monitor, Info, Image,
} from 'lucide-react';
import { callOwnerAdmin } from '@/services/ownerPortal.service';
import { useAuth } from '@/contexts/AuthContext';

interface PlatformOwnerData {
  nome_sistema: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  responsavel_nome: string;
  responsavel_cargo: string;
  email: string;
  telefone: string;
  whatsapp: string;
  site: string;
  foro_cidade: string;
  foro_estado: string;
  logo_url: string;
  email_notificacoes: string;
}

const EMPTY: PlatformOwnerData = {
  nome_sistema: '', razao_social: '', nome_fantasia: '', cnpj: '',
  endereco: '', cidade: '', estado: '', cep: '',
  responsavel_nome: '', responsavel_cargo: '',
  email: '', telefone: '', whatsapp: '', site: '',
  foro_cidade: '', foro_estado: '',
  logo_url: '', email_notificacoes: '',
};

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function MasterPlataformaDados() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSystemOwner } = useAuth();

  const [form, setForm] = useState<PlatformOwnerData>(EMPTY);
  const [dirty, setDirty] = useState(false);

  const set = (key: keyof PlatformOwnerData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setDirty(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['platform-owner-data'],
    queryFn: async () => {
      const res: any = await callOwnerAdmin({ action: 'get_platform_owner_data', payload: {} });
      return (res?.data ?? {}) as PlatformOwnerData;
    },
    enabled: isSystemOwner,
  });

  useEffect(() => {
    if (data) {
      setForm({ ...EMPTY, ...data });
      setDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PlatformOwnerData) => {
      await callOwnerAdmin({ action: 'update_platform_owner_data', payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-owner-data'] });
      setDirty(false);
      toast({ title: 'Dados da plataforma salvos com sucesso.' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro ao salvar', description: e?.message ?? String(e), variant: 'destructive' }),
  });

  function validateAndSave() {
    const cnpjDigits = form.cnpj.replace(/\D/g, '');
    if (cnpjDigits && cnpjDigits.length !== 14) {
      toast({ title: 'CNPJ inválido', description: 'O CNPJ deve ter 14 dígitos.', variant: 'destructive' });
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRe.test(form.email)) {
      toast({ title: 'E-mail inválido', description: 'Verifique o campo E-mail.', variant: 'destructive' });
      return;
    }
    if (form.email_notificacoes && !emailRe.test(form.email_notificacoes)) {
      toast({ title: 'E-mail de notificações inválido', description: 'Verifique o campo E-mail de notificações.', variant: 'destructive' });
      return;
    }
    const urlRe = /^https?:\/\/.+/i;
    if (form.site && !urlRe.test(form.site)) {
      toast({ title: 'URL do site inválida', description: 'A URL deve começar com http:// ou https://.', variant: 'destructive' });
      return;
    }
    if (form.logo_url && !urlRe.test(form.logo_url)) {
      toast({ title: 'URL do logo inválida', description: 'A URL deve começar com http:// ou https://.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  }

  if (!isSystemOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <p className="text-sm font-semibold">Acesso restrito ao SYSTEM_OWNER</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Dados da Plataforma
          </h2>
          <p className="text-sm text-muted-foreground">
            Informacoes da empresa proprietaria do sistema. Usadas em contratos, alertas e white-label.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Alteracoes nao salvas
            </Badge>
          )}
          <Button
            onClick={validateAndSave}
            disabled={saveMutation.isPending || !dirty}
            size="sm"
            className="gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Estes dados afetam todo o sistema</p>
          <p className="text-xs text-blue-700">
            Nome do sistema, dados da contratada e foro sao usados automaticamente na geracao de contratos.
            Ao vender o software, basta atualizar os campos abaixo — os proximos contratos gerados ja refletirao
            os dados da nova proprietaria.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Monitor} title="Identidade da Plataforma" description="Nome do sistema e dados da empresa proprietaria" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do Sistema / Produto" id="nome_sistema">
            <Input id="nome_sistema" placeholder="Ex: PCM Estrategico" value={form.nome_sistema} onChange={set('nome_sistema')} />
          </Field>
          <Field label="Nome Fantasia da Empresa" id="nome_fantasia">
            <Input id="nome_fantasia" placeholder="Ex: PCM Sistemas" value={form.nome_fantasia} onChange={set('nome_fantasia')} />
          </Field>
          <Field label="Razao Social" id="razao_social">
            <Input id="razao_social" placeholder="Ex: PCM Estrategico Sistemas Ltda." value={form.razao_social} onChange={set('razao_social')} />
          </Field>
          <Field label="CNPJ" id="cnpj">
            <Input id="cnpj" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={set('cnpj')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={MapPin} title="Endereco" description="Endereco da sede da empresa proprietaria" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Endereco completo" id="endereco">
              <Input id="endereco" placeholder="Rua, numero, complemento, bairro" value={form.endereco} onChange={set('endereco')} />
            </Field>
          </div>
          <Field label="Cidade" id="cidade">
            <Input id="cidade" placeholder="Porto Alegre" value={form.cidade} onChange={set('cidade')} />
          </Field>
          <Field label="Estado (UF)" id="estado">
            <Input id="estado" placeholder="RS" maxLength={2} value={form.estado} onChange={set('estado')} />
          </Field>
          <Field label="CEP" id="cep">
            <Input id="cep" placeholder="00000-000" value={form.cep} onChange={set('cep')} />
          </Field>
          <Field label="Site" id="site">
            <Input id="site" placeholder="https://www.empresa.com.br" value={form.site} onChange={set('site')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Phone} title="Contato Comercial" description="Contato oficial para clientes e contratos" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail comercial" id="email">
            <Input id="email" type="email" placeholder="comercial@empresa.com.br" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="E-mail de Notificacoes" id="email_notificacoes">
            <Input id="email_notificacoes" type="email" placeholder="alertas@empresa.com.br" value={form.email_notificacoes} onChange={set('email_notificacoes')} />
          </Field>
          <Field label="Telefone" id="telefone">
            <Input id="telefone" placeholder="+55 51 3333-3333" value={form.telefone} onChange={set('telefone')} />
          </Field>
          <Field label="WhatsApp" id="whatsapp">
            <Input id="whatsapp" placeholder="+55 51 99999-9999" value={form.whatsapp} onChange={set('whatsapp')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Image} title="Identidade Visual" description="Logo exibida no cabecalho do contrato impresso" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="URL da Logo (PNG, SVG ou JPEG)" id="logo_url">
            <Input id="logo_url" placeholder="https://empresa.com/logo.png" value={form.logo_url} onChange={set('logo_url')} />
          </Field>
          {form.logo_url && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <img
                src={form.logo_url}
                alt="Preview da logo"
                className="h-12 max-w-[200px] object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-xs text-muted-foreground">Preview da logo no contrato</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={UserCheck} title="Responsavel Legal" description="Representante da empresa para assinatura de contratos" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" id="responsavel_nome">
            <Input id="responsavel_nome" placeholder="Joao da Silva" value={form.responsavel_nome} onChange={set('responsavel_nome')} />
          </Field>
          <Field label="Cargo" id="responsavel_cargo">
            <Input id="responsavel_cargo" placeholder="Diretor / Socio-Administrador" value={form.responsavel_cargo} onChange={set('responsavel_cargo')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Gavel} title="Foro Contratual" description="Comarca eleita para resolucao de disputas — aparece na clausula 14 dos contratos" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Cidade do Foro" id="foro_cidade">
            <Input id="foro_cidade" placeholder="Porto Alegre" value={form.foro_cidade} onChange={set('foro_cidade')} />
          </Field>
          <Field label="Estado do Foro (UF)" id="foro_estado">
            <Input id="foro_estado" placeholder="RS" maxLength={2} value={form.foro_estado} onChange={set('foro_estado')} />
          </Field>
          <div className="sm:col-span-2">
            <Separator />
            <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <strong>Pre-visualizacao da clausula 14:</strong>{' '}
              Fica eleito o foro da Comarca de{' '}
              <span className="font-semibold text-foreground">
                {form.foro_cidade || '[Cidade]'}/{form.foro_estado || 'UF'}
              </span>{' '}
              para dirimir quaisquer controversias oriundas deste contrato, com renun\xc3\xa7a expressa a qualquer outro,
              por mais privilegiado que seja.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={validateAndSave}
          disabled={saveMutation.isPending || !dirty}
          className="gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar dados da plataforma
        </Button>
      </div>
    </div>
  );
}
