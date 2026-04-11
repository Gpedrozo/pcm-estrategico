import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error Resolved by Deno runtime in Supabase Edge Functions.
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type PaymentStatus = "pending" | "paid" | "late" | "failed" | "refunded";
type SubscriptionStatus = "ativa" | "atrasada" | "cancelada" | "teste";

const allowedOrigins = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin: string) => origin.trim())
  .filter(Boolean);

const asaasWebhookToken = (Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "").trim();

const webhookRateWindowMs = 60_000;
const webhookRateLimit = 150;
const requestCounter = new Map<string, { count: number; windowStart: number }>();

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function resolveCorsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token, x-asaas-access-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function requestKey(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(req: Request): boolean {
  const now = Date.now();
  const key = requestKey(req);
  const entry = requestCounter.get(key);

  if (!entry || now - entry.windowStart > webhookRateWindowMs) {
    requestCounter.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  requestCounter.set(key, entry);
  return entry.count > webhookRateLimit;
}

function normalizePaymentStatus(status?: string | null): PaymentStatus {
  const normalized = String(status ?? "").toUpperCase();
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(normalized)) return "paid";
  if (normalized === "OVERDUE") return "late";
  if (["PENDING", "AWAITING_RISK_ANALYSIS"].includes(normalized)) return "pending";
  if (["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL", "DUNNING_REQUESTED"].includes(normalized)) return "refunded";
  if (["CANCELED", "CHARGEBACK", "FAILED"].includes(normalized)) return "failed";
  return "pending";
}

function normalizeSubscriptionStatus(status?: string | null): SubscriptionStatus {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ACTIVE") return "ativa";
  if (normalized === "OVERDUE") return "atrasada";
  if (normalized === "INACTIVE" || normalized === "EXPIRED") return "cancelada";
  return "teste";
}

async function logAlert(actionType: string, severity: "info" | "warning" | "error" | "critical", details: Record<string, unknown>) {
  try {
    const admin = adminClient();
    await admin.from("enterprise_audit_logs").insert({
      action_type: actionType,
      severity,
      source: "asaas-webhook",
      details,
    });
  } catch {
    // noop
  }
}

function parseExternalReference(value: unknown): { empresaId?: string; subscriptionId?: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return {};

  if (raw.startsWith("empresa:")) {
    return { empresaId: raw.slice("empresa:".length) || undefined };
  }

  if (raw.startsWith("subscription:")) {
    return { subscriptionId: raw.slice("subscription:".length) || undefined };
  }

  return {};
}

async function resolveLocalSubscription(admin: ReturnType<typeof adminClient>, payload: any) {
  const payment = payload?.payment ?? {};
  const remoteSubscriptionId = String(payment?.subscription ?? payload?.subscription?.id ?? payload?.subscription ?? "").trim();
  const remoteCustomerId = String(payment?.customer ?? payload?.subscription?.customer ?? "").trim();

  const extFromPayment = parseExternalReference(payment?.externalReference);
  const extFromSubscription = parseExternalReference(payload?.subscription?.externalReference);
  const ext = {
    empresaId: extFromPayment.empresaId ?? extFromSubscription.empresaId,
    subscriptionId: extFromPayment.subscriptionId ?? extFromSubscription.subscriptionId,
  };

  if (remoteSubscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id,empresa_id,asaas_subscription_id,asaas_customer_id")
      .eq("asaas_subscription_id", remoteSubscriptionId)
      .maybeSingle();

    if (data?.id) return data;
  }

  if (ext.subscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id,empresa_id,asaas_subscription_id,asaas_customer_id")
      .eq("id", ext.subscriptionId)
      .maybeSingle();

    if (data?.id) return data;
  }

  if (ext.empresaId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id,empresa_id,asaas_subscription_id,asaas_customer_id")
      .eq("empresa_id", ext.empresaId)
      .maybeSingle();

    if (data?.id) return data;
  }

  if (remoteCustomerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id,empresa_id,asaas_subscription_id,asaas_customer_id")
      .eq("asaas_customer_id", remoteCustomerId)
      .maybeSingle();

    if (data?.id) return data;
  }

  return null;
}

async function upsertPayment(admin: ReturnType<typeof adminClient>, input: {
  subscriptionId: string;
  payment: Record<string, unknown>;
  eventName: string;
}) {
  const paymentId = String(input.payment?.id ?? "").trim();
  if (!paymentId) return;

  const paymentPayload = {
    subscription_id: input.subscriptionId,
    due_at: String(input.payment?.dueDate ?? "").trim() || null,
    paid_at: String(input.payment?.paymentDate ?? input.payment?.clientPaymentDate ?? "").trim() || null,
    amount: Number(input.payment?.value ?? input.payment?.netValue ?? 0),
    method: String(input.payment?.billingType ?? "").trim() || null,
    status: normalizePaymentStatus(String(input.payment?.status ?? "")),
    notes: String(input.payment?.description ?? "").trim() || null,
    provider: "asaas",
    provider_payment_id: paymentId,
    provider_event: input.eventName,
    raw_payload: input.payment,
    processed_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("subscription_payments")
    .select("id")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("subscription_payments")
      .update(paymentPayload)
      .eq("id", existing.id);
    return;
  }

  await admin
    .from("subscription_payments")
    .insert(paymentPayload);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = resolveCorsHeaders(origin);

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isRateLimited(req)) {
    await logAlert("ASAAS_WEBHOOK_RATE_LIMITED", "warning", { ip: requestKey(req) });
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!asaasWebhookToken) {
    console.error("[asaas-webhook] ASAAS_WEBHOOK_TOKEN not configured — rejecting request (fail-closed)");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  {
    const tokenHeader = req.headers.get("asaas-access-token") ?? req.headers.get("x-asaas-access-token") ?? "";
    if (!tokenHeader || tokenHeader !== asaasWebhookToken) {
      await logAlert("ASAAS_WEBHOOK_INVALID_TOKEN", "warning", {
        ip: requestKey(req),
      });
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const raw = await req.text();
    if (!raw || raw.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(raw);
    const eventName = String(payload?.event ?? "").trim();
    if (!eventName) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const localSubscription = await resolveLocalSubscription(admin, payload);

    if (!localSubscription?.id) {
      await logAlert("ASAAS_WEBHOOK_SUBSCRIPTION_NOT_FOUND", "warning", {
        event: eventName,
        payment_id: payload?.payment?.id ?? null,
        subscription_id: payload?.payment?.subscription ?? payload?.subscription?.id ?? null,
      });

      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = payload?.payment ?? null;
    const remoteSubscriptionStatus = String(payload?.subscription?.status ?? payment?.subscriptionStatus ?? "").trim();
    const normalizedSubscriptionStatus = normalizeSubscriptionStatus(remoteSubscriptionStatus);
    const normalizedPaymentStatus = normalizePaymentStatus(String(payment?.status ?? ""));

    await admin
      .from("subscriptions")
      .update({
        billing_provider: "asaas",
        asaas_subscription_id: String(payment?.subscription ?? payload?.subscription?.id ?? localSubscription?.asaas_subscription_id ?? "").trim() || localSubscription?.asaas_subscription_id || null,
        asaas_customer_id: String(payment?.customer ?? payload?.subscription?.customer ?? localSubscription?.asaas_customer_id ?? "").trim() || localSubscription?.asaas_customer_id || null,
        status: normalizedSubscriptionStatus,
        payment_status: normalizedPaymentStatus,
        renewal_at: payment?.dueDate ?? null,
        asaas_last_event_at: new Date().toISOString(),
        billing_metadata: {
          asaas: {
            event: eventName,
            payment_status: payment?.status ?? null,
            subscription_status: remoteSubscriptionStatus || null,
            due_date: payment?.dueDate ?? null,
          },
        },
      })
      .eq("id", localSubscription.id);

    if (payment?.id) {
      await upsertPayment(admin, {
        subscriptionId: String(localSubscription.id),
        payment,
        eventName,
      });
    }

    await admin.from("enterprise_audit_logs").insert({
      empresa_id: localSubscription.empresa_id,
      action_type: "ASAAS_WEBHOOK_SYNC",
      severity: "info",
      source: "asaas-webhook",
      details: {
        event: eventName,
        subscription_id: localSubscription.id,
        asaas_subscription_id: payment?.subscription ?? payload?.subscription?.id ?? null,
        payment_id: payment?.id ?? null,
      },
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    await logAlert("ASAAS_WEBHOOK_FAILED", "critical", {
      message,
      ip: requestKey(req),
    });

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
