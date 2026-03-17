BEGIN;

ALTER TABLE IF EXISTS public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empresas_select_by_slug_anon ON public.empresas;
CREATE POLICY empresas_select_by_slug_anon
ON public.empresas
FOR SELECT
TO anon
USING (slug IS NOT NULL AND length(trim(slug)) > 0);

CREATE OR REPLACE FUNCTION public.resolve_empresa_id_by_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.empresas e
  WHERE lower(e.slug) = lower(trim(p_slug))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.resolve_empresa_id_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_empresa_id_by_slug(text) TO anon, authenticated, service_role;

COMMIT;
