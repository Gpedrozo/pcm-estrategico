-- =============================================================================
-- ETAPA 1.8: RPC segura para resolução de tenant por slug e por ID
-- Objetivo: substituir SELECT direto anon na tabela empresas por funções
-- SECURITY DEFINER, eliminando o acesso anon irrestrito à tabela empresas.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Criar RPC get_empresa_info_by_id
--    Retorna apenas id, nome, slug, status de uma empresa pelo ID.
--    SECURITY DEFINER → executa como owner do schema, bypassando RLS.
--    Exposição controlada: não retorna dados sensíveis (CNPJ, config, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_empresa_info_by_id(p_empresa_id UUID)
RETURNS TABLE (
  id      UUID,
  nome    TEXT,
  slug    TEXT,
  status  TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nome,
    e.slug,
    e.status
  FROM public.empresas e
  WHERE e.id = p_empresa_id
  LIMIT 1;
$$;

-- Conceder a anon e authenticated (necessário para TenantContext pré-login)
REVOKE ALL ON FUNCTION public.get_empresa_info_by_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empresa_info_by_id(UUID)
  TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Garantir que resolve_empresa_id_by_slug também está corretamente protegida
--    (já existe desde 20260317, mas reforçar REVOKE/GRANT na assinatura correta)
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.resolve_empresa_id_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_empresa_id_by_slug(TEXT)
  TO anon, authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE '[ETAPA-1.8] RPCs get_empresa_info_by_id e resolve_empresa_id_by_slug prontas.';
END $$;

COMMIT;
