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
-- Wrapped in DO block: logo_url may not exist in all environments.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'dados_empresa'
      AND column_name  = 'logo_url'
  ) THEN
    UPDATE public.dados_empresa
    SET
      logo_principal_url = COALESCE(logo_principal_url, logo_url),
      logo_menu_url      = COALESCE(logo_menu_url,      logo_url),
      logo_login_url     = COALESCE(logo_login_url,     logo_url),
      logo_os_url        = COALESCE(logo_os_url,        logo_url),
      logo_pdf_url       = COALESCE(logo_pdf_url,       logo_url),
      logo_relatorio_url = COALESCE(logo_relatorio_url, logo_url)
    WHERE logo_url IS NOT NULL;
  END IF;
END $$;

-- [SKIP: configuracoes_sistema logo migration]

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_login_branding_by_email
-- Resolves tenant branding data by user e-mail for the login page.
-- Accessible to anon so the logo can be shown before authentication.
-- Returns only non-sensitive public data: company name + logo URL.
-- ─────────────────────────────────────────────────────────────────────────────
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
