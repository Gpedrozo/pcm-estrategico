import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10",
});

type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid" | "paused";

function normalizeSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized === "trialing" ||
    normalized === "active" ||
    normalized === "past_due" ||
    normalized === "canceled" ||
    normalized === "incomplete" ||
    normalized === "unpaid" ||
    normalized === "paused"
  ) {
    return normalized;
  }

  return "incomplete";
}

async function handleSubscriptionChange(payload: Stripe.Subscription) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripeSubscriptionId = payload.id;
  const stripeCustomerId = typeof payload.customer === "string" ? payload.customer : payload.customer.id;
  const stripePlanId = payload.items.data[0]?.plan?.id ?? null;
  const status = normalizeSubscriptionStatus(payload.status);
  const nextDueAt = payload.current_period_end ? new Date(payload.current_period_end * 1000).toISOString() : null;

  const { data: assinatura, error: assinaturaError } = await supabase
    .from("assinaturas")
    .select("id, empresa_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (assinaturaError) {
    throw assinaturaError;
  }

  if (!assinatura) {
    const { data: plano } = await supabase
      .from("planos")
      .select("id")
      .eq("nome", "Starter")
      .maybeSingle();

    if (!plano?.id) {
      throw new Error("Default plan not found to create subscription");
    }

    const empresaId = payload.metadata?.empresa_id;

    if (!empresaId) {
      throw new Error("empresa_id missing in Stripe subscription metadata");
    }

    const { error: insertError } = await supabase
      .from("assinaturas")
      .insert({
        empresa_id: empresaId,
        plano_id: plano.id,
        status,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        proximo_vencimento: nextDueAt,
      });

    if (insertError) {
      throw insertError;
    }

    await supabase
      .from("empresas")
      .update({
        status: status === "active" ? "active" : "suspended",
        ativo: status === "active",
      })
      .eq("id", empresaId);

    return;
  }

  const updates = {
    status,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    proximo_vencimento: nextDueAt,
  };

  const { error: updateError } = await supabase
    .from("assinaturas")
    .update(updates)
    .eq("id", assinatura.id);

  if (updateError) {
    throw updateError;
  }

  const { data: empresaAtual } = await supabase
    .from("empresas")
    .select("status")
    .eq("id", assinatura.empresa_id)
    .maybeSingle();

  const nextEmpresaStatus =
    status === "active"
      ? "active"
      : empresaAtual?.status === "inactive"
        ? "inactive"
        : "suspended";

  await supabase
    .from("empresas")
    .update({
      status: nextEmpresaStatus,
      ativo: status === "active",
    })
    .eq("id", assinatura.empresa_id);

  if (stripePlanId) {
    await supabase.from("enterprise_audit_logs").insert({
      empresa_id: assinatura.empresa_id,
      severity: "info",
      action_type: "STRIPE_PLAN_SYNC",
      details: { stripe_plan_id: stripePlanId, stripe_subscription_id: stripeSubscriptionId },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!stripeSecretKey || !stripeWebhookSecret) {
      return new Response(JSON.stringify({ error: "Stripe secrets not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSignature = req.headers.get("stripe-signature");

    if (!stripeSignature) {
      return new Response(JSON.stringify({ error: "Missing Stripe signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      payload,
      stripeSignature,
      stripeWebhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
