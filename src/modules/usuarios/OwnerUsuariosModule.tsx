import { useOwnerUsers } from '@/hooks/useOwnerPortal'

type User = {
  id: string
  nome?: string
  email?: string
  ativo?: boolean
}

export function OwnerUsuariosModule() {
  const { data, isLoading } = useOwnerUsers()

  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Carregando usuários...</div>
  }

  const users = ((data as User[] | undefined) ?? []).slice(0, 40)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold">Usuários da plataforma</h2>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-md border border-slate-800 p-3">
            <div>
              <p className="text-sm font-medium">{user.nome ?? 'Sem nome'}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <span className={`rounded px-2 py-1 text-xs ${user.ativo ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
              {user.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
