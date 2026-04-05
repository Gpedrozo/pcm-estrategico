import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionAlertData {
  status: string | null;
  renewal_at: string | null;
  ends_at: string | null;
  plan_name: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_name: string | null;
  custom_message: string | null;
  grace_period_days: number;
  alert_days_before: number;
}

export function useSubscriptionAlert() {
  const { tenantId, effectiveRole } = useAuth();

  const isOwner = effectiveRole === 'SYSTEM_OWNER' || effectiveRole === 'SYSTEM_ADMIN';

  return useQuery({
    queryKey: ['subscription-alert', tenantId],
    queryFn: async (): Promise<SubscriptionAlertData | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('subscriptions' as never)
        .select('status,renewal_at,ends_at,plan_id')
        .eq('empresa_id', tenantId)
        .maybeSingle();

      if (error || !data) return null;

      const row = data as Record<string, unknown>;

      let planName: string | null = null;
      if (row.plan_id) {
        const { data: plan } = await supabase
          .from('plans' as never)
          .select('name')
          .eq('id', row.plan_id)
          .maybeSingle();
        if (plan) planName = (plan as Record<string, unknown>).name as string;
      }

      // Fetch platform contact config
      let contactEmail: string | null = null;
      let contactWhatsapp: string | null = null;
      let contactName: string | null = null;
      let customMessage: string | null = null;
      let gracePeriodDays = 15;
      let alertDaysBefore = 7;

      const { data: configRows } = await supabase
        .from('configuracoes_sistema' as never)
        .select('chave,valor')
        .is('empresa_id', null)
        .in('chave', [
          'platform.contact_email',
          'platform.contact_whatsapp',
          'platform.contact_name',
          'platform.expiry_custom_message',
          'platform.grace_period_days',
          'platform.alert_days_before',
        ]);

      for (const cfg of (configRows ?? [])) {
        const c = cfg as Record<string, unknown>;
        const chave = String(c.chave ?? '');
        let val: unknown = c.valor;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { /* keep */ }
        }
        const sVal = String(val ?? '').trim();
        if (chave === 'platform.contact_email') contactEmail = sVal || null;
        if (chave === 'platform.contact_whatsapp') contactWhatsapp = sVal || null;
        if (chave === 'platform.contact_name') contactName = sVal || null;
        if (chave === 'platform.expiry_custom_message') customMessage = sVal || null;
        if (chave === 'platform.grace_period_days') gracePeriodDays = Number(val) || 15;
        if (chave === 'platform.alert_days_before') alertDaysBefore = Number(val) || 7;
      }

      return {
        status: (row.status as string) || null,
        renewal_at: (row.renewal_at as string) || null,
        ends_at: (row.ends_at as string) || null,
        plan_name: planName,
        contact_email: contactEmail,
        contact_whatsapp: contactWhatsapp,
        contact_name: contactName,
        custom_message: customMessage,
        grace_period_days: gracePeriodDays,
        alert_days_before: alertDaysBefore,
      };
    },
    enabled: !!tenantId && !isOwner,
    staleTime: 5 * 60_000,
  });
}
