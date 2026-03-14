-- Fix imediato para erro "Dominio nao autorizado para login"
-- Causa raiz: empresa_config possui apenas policy tenant_or_master,
-- sem policy de leitura publica para resolver empresa por host antes da autenticacao completa.

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'empresa_config'
      AND policyname = 'empresa_config_domain_lookup_public'
  ) THEN
    CREATE POLICY empresa_config_domain_lookup_public
      ON public.empresa_config
      FOR SELECT
      TO anon, authenticated
      USING (dominio_custom IS NOT NULL);
  END IF;
END;
$$;

-- Verificacao rapida
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'empresa_config'
  AND policyname IN ('empresa_config_domain_lookup_public', 'empresa_config_tenant_or_master')
ORDER BY policyname;
