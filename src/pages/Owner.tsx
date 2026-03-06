import { Component, type ErrorInfo, useEffect, useMemo, useState } from 'react'
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

const navItems = [
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
]

class OwnerModuleErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-rose-800 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-rose-300">Falha ao carregar módulo OWNER</h3>
          <p className="mt-2 text-sm text-slate-300">Ocorreu um erro inesperado neste módulo. Recarregue a página para continuar.</p>
        </div>
      )
    }

    return this.props.children
  }
}

export default function Owner() {
  const { isSystemOwner, isLoading, isAuthenticated, logout } = useAuth()
  const [active, setActive] = useState('dashboard')

  useEffect(() => {
    if (isLoading || !isAuthenticated || isSystemOwner) return

    void (async () => {
      await logout()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    })()
  }, [isLoading, isAuthenticated, isSystemOwner, logout])

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
      default:
        return <OwnerDashboardModule />
    }
  }, [active])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (!isSystemOwner) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-rose-800 bg-slate-900 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-950">
            <ShieldCheck className="h-6 w-6 text-rose-300" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Acesso Negado</h2>
          <p className="mt-2 text-sm text-slate-400">Este portal global é exclusivo para o perfil SYSTEM_OWNER.</p>
        </div>
      </div>
    )
  }

  return (
    <OwnerPortalLayout
      title="Owner Portal"
      subtitle="Controle global multiempresa"
      navItems={navItems}
      activeKey={active}
      onNavigate={setActive}
    >
      <OwnerModuleErrorBoundary>
        {content}
      </OwnerModuleErrorBoundary>
    </OwnerPortalLayout>
  )
}
