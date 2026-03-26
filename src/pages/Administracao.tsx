import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Users,
  Shield,
  Network,
  SlidersHorizontal,
  Workflow,
  Bell,
  BarChart3,
  Plug,
  FileCheck2,
  Palette,
  BadgeDollarSign,
  Save,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import DispositivosMoveis from '@/components/admin/DispositivosMoveis';
import { toast } from '@/hooks/use-toast';
import { useTenantAdminConfig, useSaveTenantAdminConfig } from '@/hooks/useTenantAdminConfig';
import {
  tenantVisualIdentityDefault,
  type TenantVisualIdentityConfig,
} from '@/hooks/useTenantVisualIdentity';
import {
  useSetUsuarioForcePasswordChange,
  useUpdateUsuarioRole,
  useUsuarios,
  type AppRole,
  type UsuarioCompleto,
} from '@/hooks/useUsuarios';

interface ProcessoConfig {
  quem_pode_abrir_os: 'USUARIO' | 'SOLICITANTE' | 'TECNICO' | 'SUPERVISOR' | 'ADMIN';
  quem_pode_fechar_os: 'TECNICO' | 'SUPERVISOR' | 'ADMIN';
  exige_aprovacao_supervisor: boolean;
  workflow_etapas: boolean;
  sla_horas_atendimento: number;
  sla_horas_resolucao: number;
}

interface IndicadoresConfig {
  horas_min_parada: number;
  impacto_falha_minutos: number;
  peso_mtbf: number;
  peso_mttr: number;
  peso_disponibilidade: number;
}

interface AlertasConfig {
  canal_sistema: boolean;
  canal_email: boolean;
  canal_whatsapp: boolean;
  alertar_sla_risco: boolean;
  alertar_os_parada: boolean;
  minutos_antecedencia_sla: number;
}

interface PadronizacoesConfig {
  classificacoes_os: string[];
  prioridades_os: string[];
  status_os: string[];
  tipos_falha: string[];
}

const processoDefault: ProcessoConfig = {
  quem_pode_abrir_os: 'USUARIO',
  quem_pode_fechar_os: 'TECNICO',
  exige_aprovacao_supervisor: false,
  workflow_etapas: false,
  sla_horas_atendimento: 8,
  sla_horas_resolucao: 72,
};

const indicadoresDefault: IndicadoresConfig = {
  horas_min_parada: 1,
  impacto_falha_minutos: 10,
  peso_mtbf: 40,
  peso_mttr: 30,
  peso_disponibilidade: 30,
};

const alertasDefault: AlertasConfig = {
  canal_sistema: true,
  canal_email: false,
  canal_whatsapp: false,
  alertar_sla_risco: true,
  alertar_os_parada: true,
  minutos_antecedencia_sla: 60,
};

const padronizacoesDefault: PadronizacoesConfig = {
  classificacoes_os: ['EMERGENCIAL', 'URGENTE', 'PROGRAMAVEL'],
  prioridades_os: ['ALTA', 'MEDIA', 'BAIXA'],
  status_os: ['ABERTA', 'EM_ANDAMENTO', 'PENDENTE', 'CONCLUIDA'],
  tipos_falha: ['ELETRICA', 'MECANICA', 'INSTRUMENTACAO', 'LUBRIFICACAO'],
};

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrador',
  USUARIO: 'Usuario',
  MASTER_TI: 'Master TI',
  SOLICITANTE: 'Solicitante',
};

const linkCards = [
  { title: 'Gestao de Usuarios', description: 'Perfis, edicao e ciclo de acesso', tab: 'usuarios', icon: Users },
  { title: 'Processo e SLA', description: 'Regras de abertura, fechamento e SLA', tab: 'processo', icon: Workflow },
  { title: 'Identidade Visual', description: 'Tema da empresa ou tema original do sistema', tab: 'identidade', icon: Palette },
  { title: 'Padronizacoes', description: 'Tipos, status e prioridades operacionais', tab: 'padronizacoes', icon: SlidersHorizontal },
  { title: 'Alertas', description: 'Canais e gatilhos por criticidade', tab: 'alertas', icon: Bell },
  { title: 'Indicadores', description: 'Parametros de calculo e pesos KPI', tab: 'indicadores', icon: BarChart3 },
  { title: 'Integracoes', description: 'Roadmap e governanca de integracoes', tab: 'integracoes', icon: Plug },
  { title: 'Cadastro da Empresa', description: 'Dados legais e logomarca do tenant', to: '/empresa/configuracoes', icon: Building2 },
  { title: 'Estrutura Organizacional', description: 'Plantas, areas e sistemas', to: '/hierarquia', icon: Network },
];

export default function Administracao() {
  const [searchParams] = useSearchParams();
  const { data: processoConfig } = useTenantAdminConfig<ProcessoConfig>('tenant.admin.processo', processoDefault);
  const { data: indicadoresConfig } = useTenantAdminConfig<IndicadoresConfig>('tenant.admin.indicadores', indicadoresDefault);
  const { data: alertasConfig } = useTenantAdminConfig<AlertasConfig>('tenant.admin.alertas', alertasDefault);
  const { data: padronizacoesConfig } = useTenantAdminConfig<PadronizacoesConfig>('tenant.admin.padronizacoes', padronizacoesDefault);
  const { data: visualIdentityConfig } = useTenantAdminConfig<TenantVisualIdentityConfig>(
    'tenant.admin.visual_identity',
    tenantVisualIdentityDefault,
  );
  const saveConfig = useSaveTenantAdminConfig<
    ProcessoConfig
    | IndicadoresConfig
    | AlertasConfig
    | PadronizacoesConfig
    | TenantVisualIdentityConfig
  >();

  const { data: usuarios = [], isLoading: usuariosLoading } = useUsuarios();
  const updateRole = useUpdateUsuarioRole();
  const setForcePassword = useSetUsuarioForcePasswordChange();

  const [processoForm, setProcessoForm] = useState<ProcessoConfig>(processoDefault);
  const [indicadoresForm, setIndicadoresForm] = useState<IndicadoresConfig>(indicadoresDefault);
  const [alertasForm, setAlertasForm] = useState<AlertasConfig>(alertasDefault);
  const [padronizacoesForm, setPadronizacoesForm] = useState<PadronizacoesConfig>(padronizacoesDefault);
  const [visualIdentityForm, setVisualIdentityForm] = useState<TenantVisualIdentityConfig>(tenantVisualIdentityDefault);
  const [usuariosSearch, setUsuariosSearch] = useState('');
  const [activeTab, setActiveTab] = useState('usuarios');

  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = new Set(['usuarios', 'processo', 'identidade', 'padronizacoes', 'alertas', 'indicadores', 'integracoes']);
    if (tab && validTabs.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (processoConfig) setProcessoForm(processoConfig);
  }, [processoConfig]);

  useEffect(() => {
    if (indicadoresConfig) setIndicadoresForm(indicadoresConfig);
  }, [indicadoresConfig]);

  useEffect(() => {
    if (alertasConfig) setAlertasForm(alertasConfig);
  }, [alertasConfig]);

  useEffect(() => {
    if (padronizacoesConfig) setPadronizacoesForm(padronizacoesConfig);
  }, [padronizacoesConfig]);

  useEffect(() => {
    if (visualIdentityConfig) setVisualIdentityForm(visualIdentityConfig);
  }, [visualIdentityConfig]);

  const salvarProcesso = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.processo', value: processoForm });
    toast({ title: 'Configuracoes de processo salvas' });
  };

  const salvarIndicadores = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.indicadores', value: indicadoresForm });
    toast({ title: 'Parametros de indicadores salvos' });
  };

  const salvarAlertas = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.alertas', value: alertasForm });
    toast({ title: 'Regras de alertas salvas' });
  };

  const salvarPadronizacoes = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.padronizacoes', value: padronizacoesForm });
    toast({ title: 'Padronizacoes salvas' });
  };

  const salvarIdentidadeVisual = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.visual_identity', value: visualIdentityForm });
    toast({ title: 'Identidade visual salva' });
  };

  const updateUserRole = async (userId: string, role: AppRole) => {
    await updateRole.mutateAsync({ userId, role });
  };

  const markForcePasswordChange = async (userId: string, forcePasswordChange: boolean) => {
    await setForcePassword.mutateAsync({ userId, forcePasswordChange });
  };

  const updateListField = (field: keyof PadronizacoesConfig, value: string) => {
    const parsed = value
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    setPadronizacoesForm((state) => ({
      ...state,
      [field]: parsed,
    }));
  };

  const filteredUsuarios = usuarios.filter((usuario) => {
    const search = usuariosSearch.trim().toLowerCase();
    if (!search) return true;

    return (
      usuario.nome.toLowerCase().includes(search)
      || (usuario.email ?? '').toLowerCase().includes(search)
      || ROLE_LABELS[usuario.role].toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Administracao</h1>
        <p className="text-muted-foreground">Governanca completa da empresa cliente em um unico lugar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {linkCards.map((item) => (
          <Card key={item.title}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              {item.tab ? (
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setActiveTab(item.tab)}>
                  Acessar
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link to={item.to}>Acessar</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="usuarios" className="gap-2"><Users className="h-4 w-4" /> Usuarios</TabsTrigger>
          <TabsTrigger value="processo" className="gap-2"><Workflow className="h-4 w-4" /> Processo</TabsTrigger>
          <TabsTrigger value="identidade" className="gap-2"><Palette className="h-4 w-4" /> Identidade</TabsTrigger>
          <TabsTrigger value="padronizacoes" className="gap-2"><SlidersHorizontal className="h-4 w-4" /> Padronizacoes</TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2"><Bell className="h-4 w-4" /> Alertas</TabsTrigger>
          <TabsTrigger value="indicadores" className="gap-2"><BarChart3 className="h-4 w-4" /> Indicadores</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2"><Plug className="h-4 w-4" /> Integracoes</TabsTrigger>
          <TabsTrigger value="dispositivos" className="gap-2"><Smartphone className="h-4 w-4" /> Dispositivos</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identidade Visual por Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modo de identidade visual</Label>
                  <Select
                    value={visualIdentityForm.mode}
                    onValueChange={(value) => setVisualIdentityForm((state) => ({
                      ...state,
                      mode: value as TenantVisualIdentityConfig['mode'],
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM">Usar identidade original do sistema</SelectItem>
                      <SelectItem value="TENANT">Usar identidade visual da empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground rounded-lg border border-border p-3 flex items-center">
                  Configuracao isolada por tenant. Alteracoes desta empresa nao impactam outras empresas.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cor Primaria</Label>
                  <Input
                    type="color"
                    value={visualIdentityForm.primaryColor}
                    disabled={visualIdentityForm.mode === 'SYSTEM'}
                    onChange={(e) => setVisualIdentityForm((state) => ({ ...state, primaryColor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundaria</Label>
                  <Input
                    type="color"
                    value={visualIdentityForm.secondaryColor}
                    disabled={visualIdentityForm.mode === 'SYSTEM'}
                    onChange={(e) => setVisualIdentityForm((state) => ({ ...state, secondaryColor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <Input
                    type="color"
                    value={visualIdentityForm.accentColor}
                    disabled={visualIdentityForm.mode === 'SYSTEM'}
                    onChange={(e) => setVisualIdentityForm((state) => ({ ...state, accentColor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-2">Preview rapido</p>
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded border" style={{ backgroundColor: visualIdentityForm.primaryColor }} />
                  <span className="h-6 w-6 rounded border" style={{ backgroundColor: visualIdentityForm.secondaryColor }} />
                  <span className="h-6 w-6 rounded border" style={{ backgroundColor: visualIdentityForm.accentColor }} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void salvarIdentidadeVisual()} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Identidade Visual
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestao de Usuarios Corporativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Buscar usuario</Label>
                  <Input
                    value={usuariosSearch}
                    onChange={(e) => setUsuariosSearch(e.target.value)}
                    placeholder="Nome, email ou perfil"
                  />
                </div>
                <div className="flex items-end justify-start md:justify-end text-xs text-muted-foreground">
                  Gestao unificada direto na Central Admin.
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2">Usuario</th>
                      <th className="text-left px-3 py-2">Perfil</th>
                      <th className="text-left px-3 py-2">Status Senha</th>
                      <th className="text-right px-3 py-2">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosLoading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Carregando usuarios...</td>
                      </tr>
                    ) : filteredUsuarios.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Nenhum usuario encontrado.</td>
                      </tr>
                    ) : (
                      filteredUsuarios.map((usuario: UsuarioCompleto) => (
                        <tr key={usuario.id} className="border-t border-border">
                          <td className="px-3 py-3">
                            <p className="font-medium">{usuario.nome}</p>
                            <p className="text-xs text-muted-foreground">{usuario.email || 'Sem email no perfil'}</p>
                          </td>
                          <td className="px-3 py-3">
                            <Select
                              value={usuario.role}
                              onValueChange={(value) => void updateUserRole(usuario.id, value as AppRole)}
                            >
                              <SelectTrigger className="w-[170px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USUARIO">Usuario</SelectItem>
                                <SelectItem value="SOLICITANTE">Solicitante</SelectItem>
                                <SelectItem value="ADMIN">Administrador</SelectItem>
                                <SelectItem value="MASTER_TI">Master TI</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={usuario.force_password_change ? 'destructive' : 'secondary'}>
                              {usuario.force_password_change ? 'Troca obrigatoria ativa' : 'Sem troca obrigatoria'}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void markForcePasswordChange(usuario.id, !usuario.force_password_change)}
                                className="gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                {usuario.force_password_change ? 'Liberar Senha' : 'Forcar Troca'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuracoes de Processo e SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quem pode abrir O.S</Label>
                  <Input value={processoForm.quem_pode_abrir_os} onChange={(e) => setProcessoForm((s) => ({ ...s, quem_pode_abrir_os: e.target.value as ProcessoConfig['quem_pode_abrir_os'] }))} />
                </div>
                <div className="space-y-2">
                  <Label>Quem pode fechar O.S</Label>
                  <Input value={processoForm.quem_pode_fechar_os} onChange={(e) => setProcessoForm((s) => ({ ...s, quem_pode_fechar_os: e.target.value as ProcessoConfig['quem_pode_fechar_os'] }))} />
                </div>
                <div className="space-y-2">
                  <Label>SLA atendimento (horas)</Label>
                  <Input type="number" value={processoForm.sla_horas_atendimento} onChange={(e) => setProcessoForm((s) => ({ ...s, sla_horas_atendimento: Number(e.target.value || 0) }))} />
                </div>
                <div className="space-y-2">
                  <Label>SLA resolucao (horas)</Label>
                  <Input type="number" value={processoForm.sla_horas_resolucao} onChange={(e) => setProcessoForm((s) => ({ ...s, sla_horas_resolucao: Number(e.target.value || 0) }))} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Exige aprovacao do supervisor</p>
                  <p className="text-xs text-muted-foreground">Forca validacao antes de avancar para execucao.</p>
                </div>
                <Switch checked={processoForm.exige_aprovacao_supervisor} onCheckedChange={(checked) => setProcessoForm((s) => ({ ...s, exige_aprovacao_supervisor: checked }))} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Workflow por etapas</p>
                  <p className="text-xs text-muted-foreground">Ativa fluxo com estados intermediarios no processo de O.S.</p>
                </div>
                <Switch checked={processoForm.workflow_etapas} onCheckedChange={(checked) => setProcessoForm((s) => ({ ...s, workflow_etapas: checked }))} />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void salvarProcesso()} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Processo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="padronizacoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Padronizacoes Operacionais por Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Classificacoes O.S (separadas por virgula)</Label>
                  <Input
                    value={padronizacoesForm.classificacoes_os.join(', ')}
                    onChange={(e) => updateListField('classificacoes_os', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridades O.S (separadas por virgula)</Label>
                  <Input
                    value={padronizacoesForm.prioridades_os.join(', ')}
                    onChange={(e) => updateListField('prioridades_os', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status O.S (separados por virgula)</Label>
                  <Input
                    value={padronizacoesForm.status_os.join(', ')}
                    onChange={(e) => updateListField('status_os', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipos de Falha (separados por virgula)</Label>
                  <Input
                    value={padronizacoesForm.tipos_falha.join(', ')}
                    onChange={(e) => updateListField('tipos_falha', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void salvarPadronizacoes()} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Padronizacoes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Canais e Regras de Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Canal no sistema</p>
                    <p className="text-xs text-muted-foreground">Notificacao dentro da plataforma.</p>
                  </div>
                  <Switch checked={alertasForm.canal_sistema} onCheckedChange={(checked) => setAlertasForm((s) => ({ ...s, canal_sistema: checked }))} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Canal por e-mail</p>
                    <p className="text-xs text-muted-foreground">Disparo de alerta por e-mail.</p>
                  </div>
                  <Switch checked={alertasForm.canal_email} onCheckedChange={(checked) => setAlertasForm((s) => ({ ...s, canal_email: checked }))} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Canal por WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Preparado para integracao futura.</p>
                  </div>
                  <Switch checked={alertasForm.canal_whatsapp} onCheckedChange={(checked) => setAlertasForm((s) => ({ ...s, canal_whatsapp: checked }))} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Alerta de risco de SLA</p>
                    <p className="text-xs text-muted-foreground">Notifica antes da violacao de SLA.</p>
                  </div>
                  <Switch checked={alertasForm.alertar_sla_risco} onCheckedChange={(checked) => setAlertasForm((s) => ({ ...s, alertar_sla_risco: checked }))} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2">
                  <div>
                    <p className="text-sm font-medium">Alerta para O.S de parada</p>
                    <p className="text-xs text-muted-foreground">Prioriza O.S que impactam disponibilidade.</p>
                  </div>
                  <Switch checked={alertasForm.alertar_os_parada} onCheckedChange={(checked) => setAlertasForm((s) => ({ ...s, alertar_os_parada: checked }))} />
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <Label>Antecedencia para alerta de SLA (min)</Label>
                <Input
                  type="number"
                  value={alertasForm.minutos_antecedencia_sla}
                  onChange={(e) => setAlertasForm((s) => ({ ...s, minutos_antecedencia_sla: Number(e.target.value || 0) }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void salvarAlertas()} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Regras de Alertas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicadores">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parametros de Indicadores (MTBF, MTTR, Disponibilidade)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Minimo de horas para considerar parada</Label>
                  <Input type="number" value={indicadoresForm.horas_min_parada} onChange={(e) => setIndicadoresForm((s) => ({ ...s, horas_min_parada: Number(e.target.value || 0) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Impacto minimo de falha (min)</Label>
                  <Input type="number" value={indicadoresForm.impacto_falha_minutos} onChange={(e) => setIndicadoresForm((s) => ({ ...s, impacto_falha_minutos: Number(e.target.value || 0) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Peso MTBF (%)</Label>
                  <Input type="number" value={indicadoresForm.peso_mtbf} onChange={(e) => setIndicadoresForm((s) => ({ ...s, peso_mtbf: Number(e.target.value || 0) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Peso MTTR (%)</Label>
                  <Input type="number" value={indicadoresForm.peso_mttr} onChange={(e) => setIndicadoresForm((s) => ({ ...s, peso_mttr: Number(e.target.value || 0) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Peso Disponibilidade (%)</Label>
                  <Input type="number" value={indicadoresForm.peso_disponibilidade} onChange={(e) => setIndicadoresForm((s) => ({ ...s, peso_disponibilidade: Number(e.target.value || 0) }))} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void salvarIndicadores()} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Indicadores
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integracoes (roadmap)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Estrutura preparada para cadastro de endpoints ERP, estoque externo e sensores IoT por tenant.</p>
              <p>Proximo passo: incluir cadastro de credenciais + health check por integracao.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispositivos">
          <DispositivosMoveis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
