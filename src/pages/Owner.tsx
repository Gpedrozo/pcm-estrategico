import { Component, type ErrorInfo, useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { OwnerPortalLayout } from '@/layouts/OwnerPortalLayout'
import { OwnerDashboardModule } from '@/modules/dashboard/OwnerDashboardModule'
import { OwnerEmpresasModule } from '@/modules/empresas/OwnerEmpresasModule'
import { OwnerUsuariosModule } from '@/modules/usuarios/OwnerUsuariosModule'
import { OwnerPlanosModule } from '@/modules/planos/OwnerPlanosModule'
import { OwnerAssinaturasModule } from '@/modules/assinaturas/OwnerAssinaturasModule'
import { OwnerContratosModule } from '@/modules/contratos/OwnerContratosModule'
import { OwnerAuditoriaModule } from '@/modules/auditoria/OwnerAuditoriaModule'
import { OwnerSistemaModule } from '@/modules/sistema/OwnerSistemaModule'
import { OwnerSuporteModule } from '@/modules/suporte/OwnerSuporteModule'
import { OwnerConfiguracoesModule } from '@/modules/configuracoes/OwnerConfiguracoesModule'
import { OwnerFinanceiroModule } from '@/modules/financeiro/OwnerFinanceiroModule'
import { OwnerFeatureFlagsModule } from '@/modules/feature-flags/OwnerFeatureFlagsModule'
import { OwnerMonitoramentoModule } from '@/modules/monitoramento/OwnerMonitoramentoModule'
import { OwnerLogsModule } from '@/modules/logs/OwnerLogsModule'
import { OwnerMasterModule } from '@/modules/owner-master/OwnerMasterModule'
import { useOwnerBackendHealth } from '@/hooks/useOwnerPortal'

const OWNER_MASTER_EMAIL = (import.meta.env.VITE_OWNER_MASTER_EMAIL || 'pedrozo@gppis.com.br').toLowerCase()

class OwnerModuleErrorBoundary extends Component<{
  children: React.ReactNode
  resetKey: string
  onRetry: () => void
}, { hasError: boolean }> {
  constructor(props: {
    children: React.ReactNode
    resetKey: string
    onRetry: () => void
  }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
  }

  componentDidUpdate(prevProps: Readonly<{ children: React.ReactNode; resetKey: string; onRetry: () => void }>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <h3 className="text-sm font-semibold text-destructive">Falha ao carregar modulo OWNER</h3>
          <p className="mt-2 text-sm text-muted-foreground">Ocorreu um erro inesperado neste modulo. Recarregue a pagina para continuar.</p>
          <button
            onClick={this.props.onRetry}
            className="mt-4 rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default function Owner() {
  const { isSystemOwner, isLoading, user } = useAuth()
  const { data: backendHealth, error: backendHealthError } = useOwnerBackendHealth()
  const [active, setActive] = useState('dashboard')
  const [retryNonce, setRetryNonce] = useState(0)

  const isOwnerMaster = (user?.email || '').toLowerCase() === OWNER_MASTER_EMAIL

  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'empresas', label: 'Empresas' },
      { key: 'usuarios', label: 'Usuários' },
      { key: 'planos', label: 'Planos' },
      { key: 'assinaturas', label: 'Assinaturas' },
      { key: 'contratos', label: 'Contratos' },
      { key: 'auditoria', label: 'Auditoria' },
      { key: 'sistema', label: 'Sistema' },
      { key: 'suporte', label: 'Suporte' },
      { key: 'financeiro', label: 'Financeiro' },
      { key: 'feature-flags', label: 'Feature Flags' },
      { key: 'monitoramento', label: 'Monitoramento' },
      { key: 'logs', label: 'Logs' },
      { key: 'configuracoes', label: 'Configurações' },
      ...(isOwnerMaster ? [{ key: 'owner-master', label: 'Owner Master' }] : []),
    ],
    [isOwnerMaster],
  )

  const moduleSubtitle = useMemo(() => {
    const map: Record<string, string> = {
      dashboard: 'Visao executiva do ecossistema multiempresa.',
      empresas: 'Cadastro, operacao e governanca de tenants.',
      usuarios: 'Gestao de usuarios globais e RBAC.',
      planos: 'Catalogo comercial de planos e limites.',
      assinaturas: 'Ciclo de vida de assinaturas e cobranca.',
      contratos: 'Contratos, versoes e compliance comercial.',
      auditoria: 'Trilha de auditoria e rastreabilidade.',
      sistema: 'Operacoes sensiveis e controles de plataforma.',
      suporte: 'Atendimento de chamados e respostas owner.',
      financeiro: 'Receita recorrente, churn e faturamento.',
      'feature-flags': 'Ativacao progressiva de funcionalidades.',
      monitoramento: 'Saude operacional e alertas do ambiente.',
      logs: 'Logs tecnicos e eventos de integracao.',
      configuracoes: 'Parametros por empresa e controles globais.',
      'owner-master': 'Governanca critica de superusuarios da plataforma.',
    }

    return map[active] ?? 'Controle global multiempresa.'
  }, [active])

  const content = useMemo(() => {
    switch (active) {
      case 'dashboard':
        return <OwnerDashboardModule />
      case 'empresas':
        return <OwnerEmpresasModule />
      case 'usuarios':
        return <OwnerUsuariosModule />
      case 'planos':
        return <OwnerPlanosModule />
      case 'assinaturas':
        return <OwnerAssinaturasModule />
      case 'contratos':
        return <OwnerContratosModule />
      case 'auditoria':
        return <OwnerAuditoriaModule />
      case 'sistema':
        return <OwnerSistemaModule />
      case 'suporte':
        return <OwnerSuporteModule />
      case 'financeiro':
        return <OwnerFinanceiroModule />
      case 'feature-flags':
        return <OwnerFeatureFlagsModule />
      case 'monitoramento':
        return <OwnerMonitoramentoModule />
      case 'logs':
        return <OwnerLogsModule />
      case 'configuracoes':
        return <OwnerConfiguracoesModule />
      case 'owner-master':
        return isOwnerMaster ? <OwnerMasterModule /> : <OwnerDashboardModule />
      default:
        return <OwnerDashboardModule />
    }
  }, [active, isOwnerMaster])

  const handleRetryModule = () => {
    setRetryNonce((prev) => prev + 1)
  }

  const backendCompatibility = useMemo(() => {
    const requiredActions = ['list_database_tables', 'cleanup_company_data', 'purge_table_data', 'delete_company']
    const supportedActions = backendHealth?.supported_actions ?? []
    const allRequiredSupported = requiredActions.every((action) => supportedActions.includes(action as any))

    if (backendHealthError) {
      return {
        healthy: false,
        message: String((backendHealthError as any)?.message ?? 'Falha ao validar backend owner.'),
      }
    }

    if (!backendHealth) {
      return {
        healthy: true,
        message: null,
      }
    }

    if (!allRequiredSupported) {
      return {
        healthy: false,
        message: 'Backend owner publicado sem todas as ações críticas necessárias. Atualize a edge function owner-portal-admin.',
      }
    }

    return {
      healthy: true,
      message: `Versao backend: ${backendHealth.version}`,
    }
  }, [backendHealth, backendHealthError])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isSystemOwner) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-destructive/40 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldCheck className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Acesso Negado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Este portal global e exclusivo para o perfil SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <OwnerPortalLayout
      title="Owner Portal"
      subtitle={moduleSubtitle}
      navItems={navItems}
      activeKey={active}
      onNavigate={setActive}
      backendHealthy={backendCompatibility.healthy}
      backendStatusMessage={backendCompatibility.message}
    >
      <OwnerModuleErrorBoundary resetKey={`${active}-${retryNonce}`} onRetry={handleRetryModule}>
        <div key={`${active}-${retryNonce}`}>
          {content}
        </div>
      </OwnerModuleErrorBoundary>
    </OwnerPortalLayout>
  )
}
