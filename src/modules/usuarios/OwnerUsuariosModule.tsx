import { useMemo, useState } from 'react'
import { useOwnerCompanies, useOwnerCompanyActions, useOwnerUsers } from '@/hooks/useOwnerPortal'
import { MasterPermissionsManager } from '@/components/master-ti/MasterPermissionsManager'

type User = {
  id: string
  nome?: string
  email?: string
  empresa_id?: string
  status?: 'ativo' | 'inativo'
  user_roles?: Array<{ role?: string }>
}

type Company = {
  id: string
  nome?: string
}

export function OwnerUsuariosModule() {
  const { createUserMutation, setUserStatusMutation } = useOwnerCompanyActions()
  const { data: companiesData, error: companiesError } = useOwnerCompanies()
  const [empresaFilter, setEmpresaFilter] = useState('all')
  const [form, setForm] = useState({
    empresa_id: '',
    nome: '',
    email: '',
    role: 'ADMIN',
    password: '',
    status: 'ativo',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPermissionsManager, setShowPermissionsManager] = useState(false)

  const { data, isLoading, error: usersError } = useOwnerUsers()

  const companies = useMemo(() => (Array.isArray(companiesData?.companies) ? (companiesData.companies as Company[]) : []).slice(0, 500), [companiesData])
  const users = useMemo(() => {
    const rows = (Array.isArray(data) ? (data as User[]) : []).slice(0, 300)
    if (empresaFilter === 'all') return rows
    return rows.filter((user) => user.empresa_id === empresaFilter)
  }, [data, empresaFilter])

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando usuários...</div>
  }

  if (companiesError || usersError) {
    return (
      <div className="rounded-lg border border-rose-700/50 bg-rose-950/20 p-4 text-sm text-rose-200">
        Falha ao carregar usuários/empresas: {String((usersError as any)?.message ?? (companiesError as any)?.message ?? 'erro desconhecido')}
      </div>
    )
  }

  const handleCreateUser = () => {
    if (!form.empresa_id || !form.nome.trim() || !form.email.trim() || !form.role.trim()) {
      setError('Preencha empresa, nome, email e role.')
      return
    }

    setMessage(null)
    setError(null)

    createUserMutation.mutate(
      {
        empresa_id: form.empresa_id,
        nome: form.nome.trim(),
        email: form.email.trim(),
        role: form.role.trim(),
        password: form.password || undefined,
        status: form.status,
      },
      {
        onSuccess: () => {
          setMessage('Usuário criado com sucesso.')
          setForm((prev) => ({ ...prev, nome: '', email: '', password: '' }))
        },
        onError: (err: any) => setError(err?.message ?? 'Falha ao criar usuário.'),
      },
    )
  }

  const setStatus = (userId: string, status: 'ativo' | 'inativo') => {
    setMessage(null)
    setError(null)
    setUserStatusMutation.mutate(
      { userId, status },
      {
        onSuccess: () => setMessage(`Status do usuário atualizado para ${status}.`),
        onError: (err: any) => setError(err?.message ?? 'Falha ao atualizar status do usuário.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">RBAC granular</h2>
          <button
            onClick={() => setShowPermissionsManager((prev) => !prev)}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
          >
            {showPermissionsManager ? 'Ocultar RBAC granular' : 'Abrir RBAC granular'}
          </button>
        </div>

        {showPermissionsManager && <MasterPermissionsManager />}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">Criar usuário global</h2>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={form.empresa_id}
            onChange={(e) => setForm((prev) => ({ ...prev, empresa_id: e.target.value }))}
          >
            <option value="">Empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.nome ?? company.id}</option>
            ))}
          </select>
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Role (ADMIN, MANAGER...)" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Senha inicial (opcional)" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <button
          onClick={handleCreateUser}
          className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          disabled={createUserMutation.isPending}
        >
          Criar usuário
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Usuários da plataforma</h2>
          <select
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            value={empresaFilter}
            onChange={(e) => setEmpresaFilter(e.target.value)}
          >
            <option value="all">Todas empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.nome ?? company.id}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-md border border-slate-800 p-3">
              <div>
                <p className="text-sm font-medium">{user.nome ?? 'Sem nome'}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
                <p className="text-xs text-slate-500">Empresa: {user.empresa_id ?? '-'} • Role: {user.user_roles?.[0]?.role ?? '-'} • Status: {user.status ?? 'ativo'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus(user.id, 'ativo')}
                  className="rounded border border-emerald-800 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-950"
                  disabled={user.status === 'ativo'}
                >
                  Restaurar
                </button>
                <button
                  onClick={() => setStatus(user.id, 'inativo')}
                  className="rounded border border-rose-800 px-3 py-1 text-xs text-rose-300 hover:bg-rose-950"
                  disabled={user.status === 'inativo'}
                >
                  Exclusão lógica
                </button>
              </div>
            </div>
          ))}
        </div>

        {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
