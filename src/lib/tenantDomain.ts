import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

function normalizeTenantSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 48);
}

function buildTenantHost(slug: string, tenantBaseDomain: string): string {
  return `${slug}.${tenantBaseDomain}`;
}

async function tryAssignSlug(tenantId: string, baseSlug: string): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    const { data: updatedCompany, error } = await db
      .from('empresas')
      .update({ slug: candidate })
      .eq('id', tenantId)
      .or('slug.is.null,slug.eq.""')
      .select('slug')
      .maybeSingle();

    if (!error && updatedCompany?.slug) {
      return String(updatedCompany.slug).trim().toLowerCase();
    }

    if (error && !/duplicate key|unique constraint/i.test(error.message)) {
      return null;
    }

    const { data: currentCompany } = await db
      .from('empresas')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle();

    const currentSlug = String(currentCompany?.slug ?? '').trim().toLowerCase();
    if (currentSlug) {
      return currentSlug;
    }
  }

  return null;
}

export async function resolveOrRepairTenantHost(options: {
  tenantId: string;
  tenantBaseDomain: string;
  slugHint?: string | null;
}): Promise<string | null> {
  const tenantId = String(options.tenantId || '').trim();
  const tenantBaseDomain = String(options.tenantBaseDomain || '').trim().toLowerCase();
  const slugHint = String(options.slugHint || '').trim().toLowerCase();

  if (!tenantId || !tenantBaseDomain) return null;

  const { data: configData } = await db
    .from('empresa_config')
    .select('dominio_custom')
    .eq('empresa_id', tenantId)
    .not('dominio_custom', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const customDomain = String(configData?.dominio_custom ?? '').trim().toLowerCase();
  if (customDomain) return customDomain;

  const { data: companyData } = await db
    .from('empresas')
    .select('slug,nome')
    .eq('id', tenantId)
    .maybeSingle();

  let slug = String(companyData?.slug ?? '').trim().toLowerCase();
  if (!slug) {
    const baseSlug = normalizeTenantSlug(String(companyData?.nome ?? ''))
      || normalizeTenantSlug(slugHint)
      || `empresa-${tenantId.slice(0, 8)}`;

    slug = await tryAssignSlug(tenantId, baseSlug) || '';
  }

  if (!slug && slugHint) {
    slug = normalizeTenantSlug(slugHint);
  }

  if (!slug) return null;
  return buildTenantHost(slug, tenantBaseDomain);
}
