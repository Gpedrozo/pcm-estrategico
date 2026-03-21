import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTenantAdminConfig, useSaveTenantAdminConfig } from '@/hooks/useTenantAdminConfig';

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

const linkCards = [
  { title: 'Cadastro da Empresa', description: 'Dados legais e operacionais por tenant', to: '/empresa/configuracoes', icon: Building2 },
  { title: 'Gestao de Usuarios', description: 'Perfis, edicao e ciclo de acesso', to: '/usuarios', icon: Users },
  { title: 'Perfis e Permissoes', description: 'Controle granular por modulo e acao', to: '/master-ti', icon: Shield },
  { title: 'Estrutura Organizacional', description: 'Plantas, areas e sistemas', to: '/hierarquia', icon: Network },
  { title: 'Padronizacoes', description: 'Tipos, status e prioridades operacionais', to: '/programacao', icon: SlidersHorizontal },
  { title: 'Auditoria e Seguranca', description: 'Logs e rastreabilidade de operacoes', to: '/auditoria', icon: FileCheck2 },
  { title: 'Personalizacao', description: 'Logos e layout da empresa cliente', to: '/empresa/configuracoes', icon: Palette },
  { title: 'Licenca e Limites', description: 'Plano, usuarios e capacidade contratada', to: '/owner2', icon: BadgeDollarSign },
];

export default function Administracao() {
  const { data: processoConfig } = useTenantAdminConfig<ProcessoConfig>('tenant.admin.processo', processoDefault);
  const { data: indicadoresConfig } = useTenantAdminConfig<IndicadoresConfig>('tenant.admin.indicadores', indicadoresDefault);
  const saveConfig = useSaveTenantAdminConfig<ProcessoConfig | IndicadoresConfig>();

  const [processoForm, setProcessoForm] = useState<ProcessoConfig>(processoDefault);
  const [indicadoresForm, setIndicadoresForm] = useState<IndicadoresConfig>(indicadoresDefault);

  useEffect(() => {
    if (processoConfig) setProcessoForm(processoConfig);
  }, [processoConfig]);

  useEffect(() => {
    if (indicadoresConfig) setIndicadoresForm(indicadoresConfig);
  }, [indicadoresConfig]);

  const salvarProcesso = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.processo', value: processoForm });
    toast({ title: 'Configuracoes de processo salvas' });
  };

  const salvarIndicadores = async () => {
    await saveConfig.mutateAsync({ configKey: 'tenant.admin.indicadores', value: indicadoresForm });
    toast({ title: 'Parametros de indicadores salvos' });
  };

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
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to={item.to}>Acessar</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="processo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="processo" className="gap-2"><Workflow className="h-4 w-4" /> Processo</TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2"><Bell className="h-4 w-4" /> Alertas</TabsTrigger>
          <TabsTrigger value="indicadores" className="gap-2"><BarChart3 className="h-4 w-4" /> Indicadores</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2"><Plug className="h-4 w-4" /> Integracoes</TabsTrigger>
        </TabsList>

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

        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Canais e Regras de Alertas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Base funcional ja ativa no sistema (painel + central de notificacoes).</p>
              <p>Proximo passo: persistir regras por tenant para canais sistema/email/whatsapp sem hardcode.</p>
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
      </Tabs>
    </div>
  );
}
