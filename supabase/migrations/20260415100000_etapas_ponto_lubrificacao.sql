-- ═══════════════════════════════════════════════════════════════════════
-- Migration: etapas_ponto_lubrificacao
-- Cria tabela de nível 2 (Etapas) dentro de cada Ponto de Lubrificação,
-- espelhando a hierarquia servicos_preventivos → atividades_preventivas.
-- Hierarquia:  planos_lubrificacao → rotas_lubrificacao_pontos → etapas_ponto_lubrificacao
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.etapas_ponto_lubrificacao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ponto_id    UUID NOT NULL REFERENCES public.rotas_lubrificacao_pontos(id) ON DELETE CASCADE,
  descricao   VARCHAR NOT NULL,
  tempo_estimado_min INTEGER NOT NULL DEFAULT 5,
  ordem       INTEGER NOT NULL DEFAULT 1,
  concluido   BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca por ponto
CREATE INDEX IF NOT EXISTS idx_etapas_ponto_lub_ponto_id
  ON public.etapas_ponto_lubrificacao (ponto_id);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS: empresa_id vem via JOIN com rotas_lubrificacao_pontos → planos_lubrificacao
-- Política simples: quem pode acessar o ponto pode acessar suas etapas
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.etapas_ponto_lubrificacao ENABLE ROW LEVEL SECURITY;

-- SELECT: Autenticados que podem ver o ponto-pai
CREATE POLICY etapas_ponto_lub_select ON public.etapas_ponto_lubrificacao
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (current_setting('request.jwt.claims', true)::json ->> 'empresa_id')::uuid
    )
  );

-- INSERT
CREATE POLICY etapas_ponto_lub_insert ON public.etapas_ponto_lubrificacao
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (current_setting('request.jwt.claims', true)::json ->> 'empresa_id')::uuid
    )
  );

-- UPDATE
CREATE POLICY etapas_ponto_lub_update ON public.etapas_ponto_lubrificacao
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (current_setting('request.jwt.claims', true)::json ->> 'empresa_id')::uuid
    )
  );

-- DELETE
CREATE POLICY etapas_ponto_lub_delete ON public.etapas_ponto_lubrificacao
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (current_setting('request.jwt.claims', true)::json ->> 'empresa_id')::uuid
    )
  );

-- Adicionar campo tempo_total_min ao ponto (calculado a partir das etapas)
ALTER TABLE public.rotas_lubrificacao_pontos
  ADD COLUMN IF NOT EXISTS tempo_total_min INTEGER NOT NULL DEFAULT 0;
