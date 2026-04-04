-- Migration: Create rotas_lubrificacao tables
-- Allows grouping lubrication points into sequenced daily/weekly/monthly routes

CREATE TABLE IF NOT EXISTS public.rotas_lubrificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  frequencia TEXT NOT NULL DEFAULT 'SEMANAL'
    CHECK (frequencia IN ('DIARIA','SEMANAL','MENSAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
  tempo_estimado_total_min INTEGER DEFAULT 0,
  responsavel TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.rotas_lubrificacao_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id UUID NOT NULL REFERENCES public.rotas_lubrificacao(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.planos_lubrificacao(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  codigo_ponto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  equipamento_tag TEXT,
  localizacao TEXT,
  lubrificante TEXT,
  quantidade TEXT,
  ferramenta TEXT,
  tempo_estimado_min INTEGER DEFAULT 0,
  instrucoes TEXT,
  referencia_manual TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.rotas_lubrificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas_lubrificacao_pontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotas_lubrificacao_tenant_isolation"
  ON public.rotas_lubrificacao
  FOR ALL
  USING (empresa_id = (current_setting('app.current_tenant', true))::uuid)
  WITH CHECK (empresa_id = (current_setting('app.current_tenant', true))::uuid);

CREATE POLICY "rotas_lubrificacao_pontos_tenant_isolation"
  ON public.rotas_lubrificacao_pontos
  FOR ALL
  USING (rota_id IN (SELECT id FROM public.rotas_lubrificacao WHERE empresa_id = (current_setting('app.current_tenant', true))::uuid))
  WITH CHECK (rota_id IN (SELECT id FROM public.rotas_lubrificacao WHERE empresa_id = (current_setting('app.current_tenant', true))::uuid));

-- Indexes
CREATE INDEX idx_rotas_lubrificacao_empresa ON public.rotas_lubrificacao(empresa_id);
CREATE INDEX idx_rotas_lubrificacao_pontos_rota ON public.rotas_lubrificacao_pontos(rota_id);
CREATE INDEX idx_rotas_lubrificacao_pontos_ordem ON public.rotas_lubrificacao_pontos(rota_id, ordem);
