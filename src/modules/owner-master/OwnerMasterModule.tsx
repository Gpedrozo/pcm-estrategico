import { useMemo, useState } from 'react'
import { useOwnerAuditLogs, useOwnerCompanyActions, useOwnerMasterOwners } from '@/hooks/useOwnerPortal'

type PlatformOwner = {
  user_id: string
  empresa_id?: string | null
  role: 'SYSTEM_OWNER' | 'SYSTEM_ADMIN'
  profile?: {
    nome?: string
    email?: string
  } | null
}

type HiddenAuditLog = {
  id: string
  actor_email?: string
  action_type?: string
  details?: {
    action?: string
    at?: string
  }
  created_at?: string
}

export function OwnerMasterModule() {
  const { createPlatformOwnerMutation } = useOwnerCompanyActions()
  const { data: ownersData, isLoading: isLoadingOwners } = useOwnerMasterOwners()
  const { data: hiddenLogsData, isLoading: isLoadingLogs } = useOwnerAuditLogs({ module: 'owner-master-shadow' })

  const [form, setForm] = useState({ nome: '', email: '', password: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const owners = useMemo(() => ((ownersData as PlatformOwner[] | undefined) ?? []).slice(0, 200), [ownersData])
  const hiddenLogs = useMemo(() => ((hiddenLogsData as HiddenAuditLog[] | undefined) ?? []).slice(0, 200), [hiddenLogsData])

  const handleCreateOwner = () => {
    if (!form.nome.trim() || !form.email.trim()) {
      setError('Informe nome e email do novo owner.')
      return
    }

    setMessage(null)
    setError(null)

    createPlatformOwnerMutation.mutate(
      {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password || undefined,
        role: 'SYSTEM_ADMIN',
      },
      {
        onSuccess: (result: any) => {
          const temporaryPassword = result?.owner?.temporary_password
          setMessage(temporaryPassword ? `Owner criado com sucesso. Senha temporária: ${temporaryPassword}` : 'Owner criado/atualizado com sucesso.')
          setForm({ nome: '', email: '', password: '' })
        },
        onError: (err: any) => setError(err?.message ?? 'Falha ao criar owner da plataforma.'),
      },
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold">OWNER MASTER</h2>
        <p className="mb-3 text-xs text-slate-400">Área restrita para governança da plataforma: criação de owners e auditoria oculta operacional.</p>

        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome do owner" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email do owner" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Senha inicial (opcional)" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
        </div>

        <button onClick={handleCreateOwner} className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" disabled={createPlatformOwnerMutation.isPending}>
          Criar owner
        </button>

        {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-semibold">Owners da plataforma</h3>
          {isLoadingOwners ? (
            <p className="text-sm text-slate-400">Carregando owners...</p>
          ) : (
            <div className="space-y-2">
              {owners.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum owner cadastrado.</p>
              ) : (
                owners.map((owner) => (
                  <div key={`${owner.user_id}-${owner.role}`} className="rounded border border-slate-800 p-3 text-xs">
                    <p className="font-medium">{owner.profile?.nome ?? 'Sem nome'}</p>
                    <p className="text-slate-400">{owner.profile?.email ?? '-'}</p>
                    <p className="text-slate-500">Role: {owner.role} • User ID: {owner.user_id}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-semibold">Auditoria oculta de owners</h3>
          {isLoadingLogs ? (
            <p className="text-sm text-slate-400">Carregando logs ocultos...</p>
          ) : (
            <div className="space-y-2">
              {hiddenLogs.length === 0 ? (
                <p className="text-sm text-slate-400">Sem eventos ocultos no período.</p>
              ) : (
                hiddenLogs.map((log) => (
                  <div key={log.id} className="rounded border border-slate-800 p-3 text-xs">
                    <p className="font-medium">{log.actor_email ?? '-'}</p>
                    <p className="text-slate-300">Ação: {log.details?.action ?? log.action_type ?? '-'}</p>
                    <p className="text-slate-500">Horário: {log.details?.at ? new Date(log.details.at).toLocaleString('pt-BR') : log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
