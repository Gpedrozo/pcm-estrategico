-- ============================================================
-- Migration: Create paradas_equipamento + requisicoes_material
-- These tables are required by the mecanico mobile app
-- ============================================================

-- ─── paradas_equipamento ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paradas_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  mecanico_id UUID REFERENCES public.mecanicos(id) ON DELETE SET NULL,
  mecanico_nome TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('mecanica', 'eletrica', 'operacional', 'instrumentacao')),
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paradas_equipamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paradas_equipamento_select_empresa"
  ON public.paradas_equipamento FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "paradas_equipamento_insert_empresa"
  ON public.paradas_equipamento FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "paradas_equipamento_update_empresa"
  ON public.paradas_equipamento FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_paradas_equip_empresa ON public.paradas_equipamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_paradas_equip_os ON public.paradas_equipamento(os_id);
CREATE INDEX IF NOT EXISTS idx_paradas_equip_equipamento ON public.paradas_equipamento(equipamento_id);

-- ─── requisicoes_material ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requisicoes_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  mecanico_id UUID REFERENCES public.mecanicos(id) ON DELETE SET NULL,
  mecanico_nome TEXT,
  material_id UUID REFERENCES public.materiais(id) ON DELETE SET NULL,
  descricao_livre TEXT,
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada', 'entregue')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requisicoes_material ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requisicoes_material_select_empresa"
  ON public.requisicoes_material FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "requisicoes_material_insert_empresa"
  ON public.requisicoes_material FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "requisicoes_material_update_empresa"
  ON public.requisicoes_material FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_req_mat_empresa ON public.requisicoes_material(empresa_id);
CREATE INDEX IF NOT EXISTS idx_req_mat_os ON public.requisicoes_material(os_id);
