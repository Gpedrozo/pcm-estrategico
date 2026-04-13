-- Migration: Add per-context logo columns to dados_empresa
-- Previously only logo_url (legacy main) and logo_os_url (print) existed.
-- These new columns allow full per-context logo management via MasterLogoManager.

ALTER TABLE public.dados_empresa
  ADD COLUMN IF NOT EXISTS logo_principal_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_menu_url      TEXT,
  ADD COLUMN IF NOT EXISTS logo_login_url     TEXT,
  ADD COLUMN IF NOT EXISTS logo_pdf_url       TEXT,
  ADD COLUMN IF NOT EXISTS logo_relatorio_url TEXT;

-- Populate new columns from legacy logo_url where not already set.
-- This ensures existing tenants that had logos continue to see them (logo_url may not exist).
-- [SKIP: data migration requires legacy columns]

-- [SKIP: configuracoes_sistema logo migration]

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- RPC: get_login_branding_by_email
-- Resolves tenant branding data by user e-mail for the login page.
-- Accessible to anon so the logo can be shown before authentication.
-- Returns only non-sensitive public data: company name + logo URL.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.get_login_branding_by_email(p_email text)
RETURNS TABLE(
  razao_social   text,
  nome_fantasia  text,
  logo_login_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    d.razao_social::text,
    d.nome_fantasia::text,
    COALESCE(d.logo_login_url, d.logo_principal_url)::text AS logo_login_url
  FROM profiles pr
  JOIN dados_empresa d ON d.empresa_id::text = pr.empresa_id::text
  WHERE lower(pr.email) = lower(p_email)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_branding_by_email(text) TO anon, authenticated;
