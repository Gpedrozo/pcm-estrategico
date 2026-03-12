-- TENANT FIX EMERGENCY: remover policies permissivas que continuam ativas
-- Data: 2026-03-12

BEGIN;

-- Remove explicitamente as 4 policies do incidente
DROP POLICY IF EXISTS "Authenticated users can create ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS "Authenticated users can delete ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS "Authenticated users can view ai analysis" ON public.ai_root_cause_analysis;
DROP POLICY IF EXISTS empresa_config_domain_lookup_public ON public.empresa_config;

-- Defesa extra: remove por varredura nominal em pg_policies
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = 'ai_root_cause_analysis' AND policyname IN (
          'Authenticated users can create ai analysis',
          'Authenticated users can delete ai analysis',
          'Authenticated users can view ai analysis'
        ))
        OR (tablename = 'empresa_config' AND policyname = 'empresa_config_domain_lookup_public')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END
$$;

COMMIT;

-- Prova final: deve retornar zero linhas
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'ai_root_cause_analysis' AND policyname IN (
      'Authenticated users can create ai analysis',
      'Authenticated users can delete ai analysis',
      'Authenticated users can view ai analysis'
    ))
    OR (tablename = 'empresa_config' AND policyname = 'empresa_config_domain_lookup_public')
  )
ORDER BY tablename, policyname;
