import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOwner2Actions, useOwner2Plans, useOwner2Subscriptions } from '@/hooks/useOwner2Portal'
import { safeArray, asNumber } from '@/pages/owner2/owner2Helpers'
import type { OwnerAction } from '@/services/ownerPortal.service'

export type SubscriptionRecord = Record<string, unknown>
export type PlanRecord = Record<string, unknown>
export type PaymentRecord = Record<string, unknown>

export function useSubscriptionDetail(enabled: boolean, companies: Record<string, unknown>[]) {
  const plansQuery = useOwner2Plans(enabled)
  const subscriptionsQuery = useOwner2Subscriptions(enabled)
  const execute = useOwner2Actions()

  // Selection state
  const [selectedSubId, setSelectedSubId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsLoaded, setPaymentsLoaded] = useState(false)

  // ASAAS health
  const [asaasHealthOk, setAsaasHealthOk] = useState<boolean | null>(null)

  const plans = useMemo(() => safeArray<PlanRecord>(plansQuery.data?.plans), [plansQuery.data])
  const subscriptions = useMemo(() => safeArray<SubscriptionRecord>(subscriptionsQuery.data?.subscriptions), [subscriptionsQuery.data])

  // Filtered list
  const filteredSubscriptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return subscriptions.filter((s) => {
      const empresa = companies.find((c) => String(c.id) === String(s.empresa_id))
      const empresaLabel = empresa ? String(empresa.nome ?? empresa.slug ?? '') : String(s.empresa_id ?? '')
      const textOk = !q || empresaLabel.toLowerCase().includes(q) || String(s.empresa_id ?? '').toLowerCase().includes(q)
      const statusOk = statusFilter === 'todos' || String(s.status ?? '').toLowerCase() === statusFilter
      return textOk && statusOk
    })
  }, [subscriptions, companies, searchTerm, statusFilter])

  // Selected subscription
  const selectedSub = useMemo(
    () => subscriptions.find((s) => String(s.id) === selectedSubId) ?? null,
    [subscriptions, selectedSubId],
  )

  // Auto-select first when selection is cleared
  useEffect(() => {
    if (!selectedSubId && filteredSubscriptions.length > 0) {
      setSelectedSubId(String(filteredSubscriptions[0].id ?? ''))
    }
  }, [filteredSubscriptions, selectedSubId])

  // Load payments for selected subscription
  useEffect(() => {
    if (!enabled || !selectedSubId || paymentsLoaded) return
    let cancelled = false
    setPaymentsLoading(true)
    execute
      .mutateAsync({ action: 'list_subscription_payments' as OwnerAction, payload: { subscription_id: selectedSubId } })
      .then((res) => {
        if (!cancelled) {
          const arr = Array.isArray(res?.payments) ? res.payments : []
          setPayments(arr as PaymentRecord[])
          setPaymentsLoaded(true)
        }
      })
      .catch(() => { if (!cancelled) setPayments([]) })
      .finally(() => { if (!cancelled) setPaymentsLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedSubId, paymentsLoaded])

  // ASAAS health check
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    execute.mutateAsync({ action: 'health_check' as OwnerAction, payload: {} })
      .then((res) => { if (!cancelled) setAsaasHealthOk(res?.asaas_configured === true) })
      .catch(() => { if (!cancelled) setAsaasHealthOk(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Reset payments when selection changes
  useEffect(() => {
    setPaymentsLoaded(false)
    setPayments([])
  }, [selectedSubId])

  // Metrics
  const metrics = useMemo(() => {
    const ativas = subscriptions.filter((s) => String(s.status) === 'ativa').length
    const atrasadas = subscriptions.filter((s) => String(s.status) === 'atrasada').length
    const teste = subscriptions.filter((s) => String(s.status) === 'teste').length
    const canceladas = subscriptions.filter((s) => String(s.status) === 'cancelada').length
    const totalMrr = subscriptions
      .filter((s) => String(s.status) !== 'cancelada')
      .reduce((sum, s) => sum + asNumber(s.amount, 0), 0)
    const paid = subscriptions.filter((s) => String(s.payment_status) === 'paid').length
    const late = subscriptions.filter((s) => String(s.payment_status) === 'late').length
    const arpa = subscriptions.length > 0 ? totalMrr / subscriptions.length : 0
    return { ativas, atrasadas, teste, canceladas, totalMrr, paid, late, arpa, total: subscriptions.length }
  }, [subscriptions])

  // Chart data – status distribution
  const statusChartData = useMemo(() => {
    const grouped = subscriptions.reduce<Record<string, number>>((acc, sub) => {
      const st = String(sub.status ?? 'desconhecido')
      acc[st] = (acc[st] || 0) + 1
      return acc
    }, {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [subscriptions])

  // Chart data – payment status
  const paymentStatusChartData = useMemo(() => {
    const grouped = subscriptions.reduce<Record<string, number>>((acc, sub) => {
      const st = String(sub.payment_status ?? sub.status ?? 'unknown').toLowerCase()
      acc[st] = (acc[st] || 0) + 1
      return acc
    }, {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [subscriptions])

  const busy = execute.isPending

  const runAction = useCallback(
    async (action: OwnerAction, payload: Record<string, unknown>) => {
      return execute.mutateAsync({ action, payload })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const refreshPayments = useCallback(() => {
    setPaymentsLoaded(false)
  }, [])

  return {
    // Data
    plans,
    subscriptions,
    filteredSubscriptions,
    selectedSub,
    payments,
    metrics,
    statusChartData,
    paymentStatusChartData,
    asaasHealthOk,

    // State
    selectedSubId,
    setSelectedSubId,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    paymentsLoading,
    busy,

    // Actions
    runAction,
    refreshPayments,

    // Query states
    plansLoading: plansQuery.isLoading,
    subscriptionsLoading: subscriptionsQuery.isLoading,
  }
}
