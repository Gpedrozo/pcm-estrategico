-- Migration: Add requer_parada, imagem_url to rotas_lubrificacao_pontos
-- and create lubrificantes + movimentacoes_lubrificante tables

-- ═══════════════════════════════════════════════════════
-- 1. ALTER rotas_lubrificacao_pontos
-- ═══════════════════════════════════════════════════════
ALTER TABLE rotas_lubrificacao_pontos
  ADD COLUMN IF NOT EXISTS requer_parada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imagem_url text;

-- ═══════════════════════════════════════════════════════
-- 2. CREATE TABLE lubrificantes
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lubrificantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'graxa' CHECK (tipo IN ('graxa','oleo','spray','outro')),
  fabricante text,
  viscosidade text,
  unidade_medida text NOT NULL DEFAULT 'kg',
  estoque_atual numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  cor_identificacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- ═══════════════════════════════════════════════════════
-- 3. CREATE TABLE movimentacoes_lubrificante
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS movimentacoes_lubrificante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lubrificante_id uuid NOT NULL REFERENCES lubrificantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  data timestamptz NOT NULL DEFAULT now(),
  observacoes text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 4. RLS for lubrificantes
-- ═══════════════════════════════════════════════════════
ALTER TABLE lubrificantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lubrificantes_tenant_isolation" ON lubrificantes
  USING (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

CREATE POLICY "lubrificantes_insert" ON lubrificantes
  FOR INSERT WITH CHECK (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

CREATE POLICY "lubrificantes_update" ON lubrificantes
  FOR UPDATE USING (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

CREATE POLICY "lubrificantes_delete" ON lubrificantes
  FOR DELETE USING (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- 5. RLS for movimentacoes_lubrificante
-- ═══════════════════════════════════════════════════════
ALTER TABLE movimentacoes_lubrificante ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimentacoes_lub_tenant_isolation" ON movimentacoes_lubrificante
  USING (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

CREATE POLICY "movimentacoes_lub_insert" ON movimentacoes_lubrificante
  FOR INSERT WITH CHECK (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- 6. Indexes
-- ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_lubrificantes_empresa ON lubrificantes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lub_empresa ON movimentacoes_lubrificante(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lub_lubrificante ON movimentacoes_lubrificante(lubrificante_id);

-- ═══════════════════════════════════════════════════════
-- 7. RPC para atualizar estoque após movimentação
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atualizar_estoque_lubrificante(
  p_lubrificante_id uuid,
  p_tipo text,
  p_quantidade numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_tipo = 'entrada' THEN
    UPDATE lubrificantes SET estoque_atual = estoque_atual + p_quantidade, updated_at = now()
    WHERE id = p_lubrificante_id;
  ELSIF p_tipo = 'saida' THEN
    UPDATE lubrificantes SET estoque_atual = GREATEST(0, estoque_atual - p_quantidade), updated_at = now()
    WHERE id = p_lubrificante_id;
  ELSIF p_tipo = 'ajuste' THEN
    UPDATE lubrificantes SET estoque_atual = p_quantidade, updated_at = now()
    WHERE id = p_lubrificante_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION atualizar_estoque_lubrificante(uuid, text, numeric) TO authenticated;

-- ═══════════════════════════════════════════════════════
-- 8. updated_at trigger for lubrificantes
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_lubrificantes ON lubrificantes;
CREATE TRIGGER set_updated_at_lubrificantes
  BEFORE UPDATE ON lubrificantes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
