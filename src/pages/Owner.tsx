import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { OwnerPortalLayout } from '@/layouts/OwnerPortalLayout'
import { OwnerDashboardModule } from '@/modules/dashboard/OwnerDashboardModule'
import { OwnerEmpresasModule } from '@/modules/empresas/OwnerEmpresasModule'
import { OwnerUsuariosModule } from '@/modules/usuarios/OwnerUsuariosModule'
import { OwnerPlanosModule } from '@/modules/planos/OwnerPlanosModule'
import { OwnerAssinaturasModule } from '@/modules/assinaturas/OwnerAssinaturasModule'
import { OwnerAuditoriaModule } from '@/modules/auditoria/OwnerAuditoriaModule'
import { OwnerSistemaModule } from '@/modules/sistema/OwnerSistemaModule'
import { OwnerSuporteModule } from '@/modules/suporte/OwnerSuporteModule'
import { OwnerConfiguracoesModule } from '@/modules/configuracoes/OwnerConfiguracoesModule'

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'empresas', label: 'Empresas' },
  { key: 'usuarios', label: 'Usuários' },
  { key: 'planos', label: 'Planos' },
  { key: 'assinaturas', label: 'Assinaturas' },
  { key: 'auditoria', label: 'Auditoria' },
  { key: 'sistema', label: 'Sistema' },
  { key: 'suporte', label: 'Suporte' },
  { key: 'configuracoes', label: 'Configurações' },
]

export default function Owner() {
  const { isSystemOwner } = useAuth()
  const [active, setActive] = useState('dashboard')

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
      case 'auditoria':
        return <OwnerAuditoriaModule />
      case 'sistema':
        return <OwnerSistemaModule />
      case 'suporte':
        return <OwnerSuporteModule />
      case 'configuracoes':
        return <OwnerConfiguracoesModule />
      default:
        return <OwnerDashboardModule />
    }
  }, [active])

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
      {content}
    </OwnerPortalLayout>
  )
}
