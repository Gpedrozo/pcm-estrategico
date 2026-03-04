import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { callOwnerAdmin } from '@/services/ownerPortal.service'

export function OwnerSistemaModule() {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateSystemAdmin = async () => {
    if (!userId.trim()) {
      setError('Informe o ID do usuário para promover para SYSTEM_ADMIN.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      await callOwnerAdmin({ action: 'create_system_admin', user_id: userId.trim() })
      setMessage('Permissão SYSTEM_ADMIN concedida com sucesso.')
      setUserId('')
      queryClient.invalidateQueries({ queryKey: ['owner', 'users'] })
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao promover usuário para SYSTEM_ADMIN.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold">Sistema</h2>
      <p className="mt-2 text-sm text-slate-400">Operações globais sensíveis do ambiente multiempresa.</p>

      <div className="mt-4 rounded-md border border-slate-800 p-3">
        <h3 className="text-sm font-medium">Promover usuário para SYSTEM_ADMIN</h3>
        <p className="mt-1 text-xs text-slate-400">Informe o ID do usuário existente para conceder privilégio administrativo global.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="UUID do usuário"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button
            onClick={handleCreateSystemAdmin}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
            disabled={isSubmitting}
          >
            Conceder SYSTEM_ADMIN
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
