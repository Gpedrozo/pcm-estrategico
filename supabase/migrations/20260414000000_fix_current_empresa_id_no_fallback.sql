-- =============================================================================
-- ETAPA 1.2 — Remover fallback catastrófico de current_empresa_id()
-- Problema: o 3º COALESCE retornava a empresa mais antiga do banco para qualquer
--           usuário sem claim JWT e sem profile — vazamento cross-tenant silencioso.
-- Solução:  retornar NULL quando não há claim nem profile. As RLS policies que
--           usam current_empresa_id() passam a NEGAR acesso (correto) em vez
--           de vazar dados de outro tenant.
-- Pré-requisito: etapa 1.1 confirmou 0 usuários sem empresa (exceto admins).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SAFETY GATE: abortar se ainda houver usuários comuns sem empresa_id
-- (re-executa o diagnóstico da etapa 1.1 como proteção)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    AND ur.role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
  WHERE u.deleted_at IS NULL
    AND (p.empresa_id IS NULL OR p.id IS NULL)
    AND ur.user_id IS NULL;

  IF v_count > 0 THEN
    RAISE EXCEPTION
      '[ABORT] % usuário(s) sem empresa_id encontrado(s). '
      'Corrija os profiles antes de aplicar esta migration.',
      v_count;
  END IF;

  RAISE NOTICE '[OK] Safety gate passou — 0 usuários comuns sem empresa_id.';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reescrever public.current_empresa_id() — versão sem fallback perigoso
--    (definida em 20260302240000_saas_professional_multiempresa_backend.sql)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1º: claim do JWT (mais rápido, sem SELECT)
    NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
    -- 2º: membros_empresa (modelo SaaS multiempresa)
    (SELECT me.empresa_id
       FROM public.membros_empresa me
      WHERE me.user_id = auth.uid()
        AND me.status = 'active'
      ORDER BY me.created_at
      LIMIT 1),
    -- 3º: user_roles com empresa vinculada
    (SELECT ur.empresa_id
       FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.empresa_id IS NOT NULL
      ORDER BY ur.created_at
      LIMIT 1),
    -- 4º: profile do usuário
    (SELECT p.empresa_id
       FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1)
    -- REMOVIDO: (SELECT id FROM empresas ORDER BY created_at LIMIT 1)
    -- Motivo: fallback para primeira empresa = vazamento cross-tenant crítico.
    -- Sem empresa resolvida → retorna NULL → RLS nega acesso (comportamento correto).
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Reescrever public.get_current_empresa_id() — versão legada (alias)
--    (definida em 20260302200200_rebuild_phase2_security.sql)
--    Agora delega para current_empresa_id() para garantir consistência.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_empresa_id();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Garantir grants corretos (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.current_empresa_id()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_empresa_id()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_empresa_id() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL (visível no log da migration)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '[1.2 OK] current_empresa_id() e get_current_empresa_id() '
               'reescritas sem fallback para primeira empresa. '
               'Usuários sem tenant resolvido receberão NULL (acesso negado).';
END $$;
