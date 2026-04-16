import { type OwnerAction } from '@/services/ownerPortal.service'

export const OWNER_TABS = [
  'dashboard',
  'monitoramento',
  'cadastro',
  'usuarios',
  'comercial',
  'financeiro',
  'contratos',
  'suporte',
  'configuracoes',
  'feature-flags',
  'dispositivos',
  'auditoria',
  'logs',
  'sistema',
  'owner-master',
] as const

export type OwnerTab = (typeof OWNER_TABS)[number]

export const OWNER_TAB_LABELS: Record<OwnerTab, string> = {
  dashboard: 'Dashboard',
  monitoramento: 'Monitoramento',
  cadastro: 'Cadastro',
  usuarios: 'Usuarios',
  comercial: 'Planos',
  financeiro: 'Financeiro',
  contratos: 'Contratos',
  suporte: 'Suporte',
  configuracoes: 'Configuracoes',
  'feature-flags': 'Feature Flags',
  dispositivos: 'Dispositivos',
  auditoria: 'Auditoria',
  logs: 'Logs',
  sistema: 'Sistema',
  'owner-master': 'Owner Master',
}

export type CompanyCredentialNote = {
  companyName: string
  companySlug: string
  masterEmail: string
  initialPassword: string
  loginUrl: string
  noteText: string
}

export type CriticalActionRequest = {
  title: string
  description: string
  confirmText: string
  action: OwnerAction
  payload: Record<string, unknown>
  successMessage: string
  masterOnly?: boolean
}
