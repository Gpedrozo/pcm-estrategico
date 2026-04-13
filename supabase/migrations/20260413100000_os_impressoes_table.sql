-- =============================================================================
-- FEATURE: Rastreamento de impressões das Ordens de Serviço
-- Tabela: os_impressoes
-- Registra cada vez que uma O.S é impressa, por quem e quando.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabela principal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.os_impressoes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id           UUID          NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  empresa_id      UUID          NOT NULL,
  impresso_por    UUID          NOT NULL,          -- auth.uid() de quem clicou em imprimir
  impresso_por_nome TEXT,                          -- nome/email desnormalizado para exibição fácil
  impresso_em     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Índices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_os_impressoes_os_id      ON public.os_impressoes(os_id);
CREATE INDEX IF NOT EXISTS idx_os_impressoes_empresa_id ON public.os_impressoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_impressoes_impresso_em ON public.os_impressoes(impresso_em DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.os_impressoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_impressoes FORCE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado do tenant pode ver
CREATE POLICY "os_impressoes_select_tenant"
  ON public.os_impressoes FOR SELECT TO authenticated
  USING (public.can_access_empresa(empresa_id));

-- Inserção: apenas usuário autenticado do próprio tenant (via frontend)
CREATE POLICY "os_impressoes_insert_tenant"
  ON public.os_impressoes FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_empresa(empresa_id)
    AND impresso_por = auth.uid()
  );

-- service_role tem acesso total
CREATE POLICY "os_impressoes_service_role"
  ON public.os_impressoes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Grants
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.os_impressoes TO authenticated;
GRANT ALL ON public.os_impressoes TO service_role;

COMMIT;
