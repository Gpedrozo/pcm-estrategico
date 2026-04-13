import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Download,
  Edit,
  Settings2,
  ShieldCheck,
  Trash2,
  UserX,
  UserCheck,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { SurfaceCard, MetricTile } from './owner2Components'
import { statusColor, downloadCsv } from './owner2Helpers'
import type { OwnerUser } from '@/services/ownerPortal.service'
import { ROLE_LABELS } from '@/lib/roleLabels'

const PAGE_SIZE = 20

interface OwnerUsuariosTabProps {
  users: Array<Record<string, unknown>>
  companies: Array<Record<string, unknown>>
  companyId: string
  isOwnerMaster: boolean
  busy: boolean
  runAction: (action: string, payload: Record<string, unknown>, successMessage: string) => void
  setFeedback: (msg: string | null) => void
}

export default function OwnerUsuariosTab({
  users,
  companies,
  companyId,
  isOwnerMaster,
  busy,
  runAction,
  setFeedback,
}: OwnerUsuariosTabProps) {
  // ── Form States: Criar usuário ──
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('ADMIN')
  const [newUserRequirePasswordChange, setNewUserRequirePasswordChange] = useState(true)

  // ── Form States: Editar usuário ──
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userTargetCompanyId, setUserTargetCompanyId] = useState('')
  const [userTargetRole, setUserTargetRole] = useState('USUARIO')
  const [userNewPassword, setUserNewPassword] = useState('')

  // ── Filtros e Paginação ──
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<'todos' | 'ativo' | 'inativo' | 'excluido'>('ativo')
  const [currentPage, setCurrentPage] = useState(1)

  // ── Dialog de Confirmação ──
  const [confirmAction, setConfirmAction] = useState<{
    type: 'inativar' | 'excluir'
    userId: string
    userName: string
  } | null>(null)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [userSearch, userStatusFilter])

  // ── Helpers ──
  const isDeviceUser = (u: Record<string, unknown>) =>
    String(u.nome ?? '').toLowerCase().startsWith('dispositivo ') || String(u.email ?? '').toLowerCase().endsWith('@mecanico.pcm.local')

  // ── Filtros e resumo ──
  const usersFiltered = useMemo(() => {
    const query = userSearch.trim().toLowerCase()

    return users.filter((u) => {
      // Ocultar usuários de dispositivo (QR Code) da listagem
      if (isDeviceUser(u)) return false

      const name = String(u.nome ?? '').toLowerCase()
      const email = String(u.email ?? '').toLowerCase()
      const status = String(u.status ?? '').toLowerCase()
      const empresaNome = String(u.empresa_nome ?? '').toLowerCase()

      const matchesText = !query || name.includes(query) || email.includes(query) || empresaNome.includes(query)

      let matchesStatus = true
      if (userStatusFilter === 'ativo') matchesStatus = status === 'ativo'
      else if (userStatusFilter === 'inativo') matchesStatus = status === 'inativo'
      else if (userStatusFilter === 'excluido') matchesStatus = status === 'excluido'

      // owner_system não vê excluídos
      if (!isOwnerMaster && status === 'excluido') return false

      return matchesText && matchesStatus
    }).sort((a, b) => {
      const statusOrder = (s: string) => {
        const st = String(s).toLowerCase()
        if (st === 'ativo') return 0
        if (st === 'inativo') return 1
        return 2 // excluido ou outros
      }
      return statusOrder(String(a.status ?? '')) - statusOrder(String(b.status ?? ''))
    })
  }, [userSearch, userStatusFilter, users, isOwnerMaster])

  const userSummary = useMemo(() => {
    const humanUsers = users.filter((u) => !isDeviceUser(u))
    const activeUsers = humanUsers.filter((u) => String(u.status ?? '').toLowerCase() === 'ativo')
    const inactive = humanUsers.filter((u) => String(u.status ?? '').toLowerCase() === 'inativo').length
    const deleted = humanUsers.filter((u) => String(u.status ?? '').toLowerCase() === 'excluido').length
    const admins = humanUsers.filter((u) => {
      const role = String(u.role ?? '').toUpperCase()
      return role === 'ADMIN' || role === 'MASTER_TI'
    }).length

    return {
      total: activeUsers.length,
      active: activeUsers.length,
      inactive,
      deleted,
      admins,
    }
  }, [users])

  // ── Paginação ──
  const totalPages = Math.max(1, Math.ceil(usersFiltered.length / PAGE_SIZE))
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return usersFiltered.slice(start, start + PAGE_SIZE)
  }, [usersFiltered, currentPage])

  // ── Selected user info ──
  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === selectedUserId) ?? null,
    [users, selectedUserId],
  )

  // ── Ações ──
  function handleActivate(userId: string) {
    runAction('set_user_status', { user_id: userId, status: 'ativo' }, 'Usuário ativado com sucesso.')
  }

  function handleInactivate(userId: string, userName: string) {
    setConfirmAction({ type: 'inativar', userId, userName })
  }

  function handleDelete(userId: string, userName: string) {
    setConfirmAction({ type: 'excluir', userId, userName })
  }

  function executeConfirmedAction() {
    if (!confirmAction) return
    if (confirmAction.type === 'inativar') {
      runAction('set_user_status', { user_id: confirmAction.userId, status: 'inativo' }, 'Usuário inativado com sucesso.')
    } else {
      runAction('delete_user', { user_id: confirmAction.userId }, 'Usuário excluído com sucesso.')
    }
    setConfirmAction(null)
  }

  function exportUsersCsv() {
    const rows = usersFiltered.map((u) => [
      String(u.id ?? ''),
      String(u.nome ?? ''),
      String(u.email ?? ''),
      String(u.role ?? ''),
      String(u.empresa_nome ?? u.empresa_id ?? ''),
      String(u.status ?? ''),
    ])
    downloadCsv('owner-usuarios.csv', ['id', 'nome', 'email', 'role', 'empresa', 'status'], rows)
    setFeedback('Exportação de usuarios gerada em CSV.')
  }

  function handleCreateUser() {
    runAction('create_user', {
      user: {
        nome: newUserName,
        email: newUserEmail,
        role: newUserRole,
        empresa_id: companyId,
        force_password_change: newUserRequirePasswordChange,
      },
    }, 'Usuário criado com sucesso.')
    setNewUserName('')
    setNewUserEmail('')
  }

  const statusFilterOptions = isOwnerMaster
    ? [
        { value: 'todos', label: 'Status: Todos' },
        { value: 'ativo', label: 'Somente ativos' },
        { value: 'inativo', label: 'Somente inativos' },
        { value: 'excluido', label: 'Somente excluídos' },
      ]
    : [
        { value: 'todos', label: 'Status: Todos' },
        { value: 'ativo', label: 'Somente ativos' },
        { value: 'inativo', label: 'Somente inativos' },
      ]

  return (
    <div className="space-y-4">
      {/* ═══════ BLOCO 1: Listagem (full-width, topo) ═══════ */}
      <SurfaceCard title="Usuários" subtitle="Painel operacional com busca, filtros e ações">
        {/* Métricas */}
        <div className="mb-3 grid gap-2 grid-cols-2 sm:grid-cols-4">
          <MetricTile label="Ativos" value={userSummary.active} icon={ShieldCheck} tone="emerald" />
          <MetricTile label="Inativos" value={userSummary.inactive} icon={AlertTriangle} tone="amber" />
          {isOwnerMaster && (
            <MetricTile label="Excluídos" value={userSummary.deleted} icon={UserX} tone="rose" />
          )}
          <MetricTile label="Admins" value={userSummary.admins} icon={Settings2} tone="sky" />
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm"
              placeholder="Buscar por nome, email ou empresa..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={userStatusFilter}
            onChange={(e) => setUserStatusFilter(e.target.value as typeof userStatusFilter)}
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg border border-input px-3 py-2 text-sm"
            onClick={() => {
              setUserSearch('')
              setUserStatusFilter('todos')
            }}
          >
            Limpar
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground"
            onClick={exportUsersCsv}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {usersFiltered.length} usuário{usersFiltered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Nome</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Role</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Empresa</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
                <th className="px-3 py-2 text-right font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => {
                const st = String(u.status ?? 'ativo')
                const role = String(u.role ?? '')
                const nome = String(u.nome ?? '-')
                const email = String(u.email ?? '-')
                const empresa = String(u.empresa_nome || '(sem empresa)')
                const isDeleted = st === 'excluido'
                const isInactive = st === 'inativo'
                const isSystemRole = role === 'SYSTEM_OWNER' || role === 'SYSTEM_ADMIN'
                const isSelected = String(u.id) === selectedUserId

                return (
                  <tr
                    key={String(u.id)}
                    className={[
                      'border-t border-border transition-colors',
                      isDeleted ? 'opacity-50 bg-muted/50' : '',
                      isSelected && !isDeleted ? 'bg-sky-50 border-l-2 border-l-sky-500' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="px-3 py-2 font-medium">
                      <span className="block truncate" title={nome}>{nome}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="block truncate" title={email}>{email}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-foreground border-border max-w-full truncate">
                        {(ROLE_LABELS[role] ?? role) || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 max-w-full text-muted-foreground" title={empresa}>
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{empresa}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${statusColor(st)}`}>
                        {st}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {!isDeleted && !isSystemRole && (
                          <>
                            {isInactive ? (
                              <button
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                title="Ativar"
                                disabled={busy}
                                onClick={() => handleActivate(String(u.id))}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                className="rounded p-1 text-amber-600 hover:bg-amber-50"
                                title="Inativar"
                                disabled={busy}
                                onClick={() => handleInactivate(String(u.id), String(u.nome ?? u.email ?? ''))}
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              className="rounded p-1 text-muted-foreground hover:bg-muted"
                              title="Selecionar para edição"
                              onClick={() => setSelectedUserId(String(u.id))}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            {isOwnerMaster && (
                              <button
                                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                title="Excluir usuário"
                                disabled={busy}
                                onClick={() => handleDelete(String(u.id), String(u.nome ?? u.email ?? ''))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        {isDeleted && isOwnerMaster && (
                          <span className="text-[10px] text-muted-foreground italic">excluído</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                    Nenhum usuário encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="rounded border border-input p-1 disabled:opacity-30"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="rounded border border-input p-1 disabled:opacity-30"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* ═══════ BLOCO 2: Formulários lado a lado (embaixo) ═══════ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Criar Usuário */}
        <SurfaceCard title="Novo usuário">
          <div className="grid gap-2">
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nome completo"
            />
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
            >
              <option value="MASTER_TI">Master TI</option>
              <option value="ADMIN">Administrador</option>
              <option value="USUARIO">Usuário</option>
              <option value="SOLICITANTE">Solicitante</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newUserRequirePasswordChange}
                onChange={(e) => setNewUserRequirePasswordChange(e.target.checked)}
              />
              Exigir troca de senha no 1º login
            </label>
            <button
              className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy || !companyId || !newUserName || !newUserEmail}
              onClick={handleCreateUser}
            >
              Criar usuário
            </button>
          </div>
        </SurfaceCard>

        {/* Gerenciar Usuário */}
        <SurfaceCard title="Gerenciar usuário">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Selecionar usuário</label>
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Selecione um usuário</option>
              {users
                .filter((u) => String(u.status ?? '') !== 'excluido' && !isDeviceUser(u))
                .map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>
                    {String(u.nome ?? u.email ?? u.id)}
                  </option>
                ))}
            </select>

            {selectedUser && (
              <div className="mt-1 rounded-lg border border-border bg-muted/50 p-2 text-xs text-muted-foreground">
                <p><strong>Email:</strong> {String(selectedUser.email ?? '-')}</p>
                <p><strong>Role:</strong> {ROLE_LABELS[String(selectedUser.role ?? '')] ?? String(selectedUser.role ?? '-')}</p>
                <p><strong>Empresa:</strong> {String(selectedUser.empresa_nome ?? selectedUser.empresa_id ?? '-')}</p>
                <p><strong>Status:</strong> {String(selectedUser.status ?? '-')}</p>
              </div>
            )}

            <div className="mt-2 grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Mover para outra empresa</label>
              <select
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={userTargetCompanyId}
                onChange={(e) => setUserTargetCompanyId(e.target.value)}
              >
                <option value="">Empresa destino</option>
                {companies.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.nome ?? c.slug ?? c.id)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={userTargetRole}
                onChange={(e) => setUserTargetRole(e.target.value)}
              >
                <option value="ADMIN">Administrador</option>
                <option value="USUARIO">Usuário</option>
                <option value="SOLICITANTE">Solicitante</option>
                <option value="MASTER_TI">Master TI</option>
              </select>
              <button
                className="rounded-lg border border-input px-3 py-2 text-sm disabled:opacity-50"
                disabled={busy || !selectedUserId || !userTargetCompanyId}
                onClick={() =>
                  runAction(
                    'move_user_company',
                    { user_id: selectedUserId, new_empresa_id: userTargetCompanyId, user: { role: userTargetRole } },
                    'Usuário movido para nova empresa com sucesso.',
                  )
                }
              >
                Mover para outra empresa
              </button>
            </div>

            <div className="mt-2 grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Redefinir senha</label>
              <input
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                type="password"
                value={userNewPassword}
                onChange={(e) => setUserNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 8 caracteres)"
              />
              <button
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 disabled:opacity-50"
                disabled={busy || !selectedUserId || userNewPassword.length < 8}
                onClick={() =>
                  runAction(
                    'set_user_password',
                    { user_id: selectedUserId, new_password: userNewPassword, force_password_change: true },
                    'Senha redefinida. Usuário deverá trocar no 1º login.',
                  )
                }
              >
                Trocar senha e forçar troca no 1º login
              </button>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ── Dialog de Confirmação ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-sm font-bold text-foreground">
              {confirmAction.type === 'excluir' ? 'Confirmar exclusão' : 'Confirmar inativação'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction.type === 'excluir' ? (
                <>
                  Tem certeza que deseja <span className="font-semibold text-rose-600">excluir</span> o
                  usuário <strong>{confirmAction.userName}</strong>?
                  <br />
                  <span className="text-xs text-muted-foreground">
                    O usuário perderá acesso e ficará oculto para outros operadores. O histórico será preservado.
                  </span>
                </>
              ) : (
                <>
                  Tem certeza que deseja <span className="font-semibold text-amber-600">inativar</span> o
                  usuário <strong>{confirmAction.userName}</strong>?
                  <br />
                  <span className="text-xs text-muted-foreground">O usuário perderá acesso ao sistema temporariamente.</span>
                </>
              )}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white ${
                  confirmAction.type === 'excluir' ? 'bg-rose-600' : 'bg-amber-600'
                }`}
                disabled={busy}
                onClick={executeConfirmedAction}
              >
                {confirmAction.type === 'excluir' ? 'Sim, excluir' : 'Sim, inativar'}
              </button>
              <button
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
