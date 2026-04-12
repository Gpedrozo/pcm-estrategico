CREATE TABLE IF NOT EXISTS public.movimentacoes_epi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  epi_id            UUID NOT NULL REFERENCES public.epis(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO')),
  quantidade        INTEGER NOT NULL CHECK (quantidade > 0),
  saldo_antes       INTEGER NOT NULL DEFAULT 0,
  saldo_depois      INTEGER NOT NULL DEFAULT 0,
  motivo            TEXT,
  documento_ref     TEXT,
  colaborador_nome  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_epi_empresa ON public.movimentacoes_epi(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_epi_epi     ON public.movimentacoes_epi(epi_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_epi_tipo    ON public.movimentacoes_epi(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_epi_created ON public.movimentacoes_epi(created_at DESC);
CREATE OR REPLACE FUNCTION public.atualizar_estoque_epi_por_movimentacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.epis SET estoque_atual = NEW.saldo_depois, updated_at = now() WHERE id = NEW.epi_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimentacao_epi_estoque ON public.movimentacoes_epi;
CREATE TRIGGER trg_movimentacao_epi_estoque AFTER INSERT ON public.movimentacoes_epi FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque_epi_por_movimentacao();

ALTER TABLE public.movimentacoes_epi ENABLE ROW LEVEL SECURITY;
CREATE POLICY movimentacoes_epi_select ON public.movimentacoes_epi FOR SELECT USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY movimentacoes_epi_insert ON public.movimentacoes_epi FOR INSERT WITH CHECK (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY movimentacoes_epi_delete ON public.movimentacoes_epi FOR DELETE USING (tipo = 'AJUSTE' AND empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
GRANT ALL ON public.movimentacoes_epi TO authenticated;
GRANT ALL ON public.movimentacoes_epi TO service_role;
CREATE TABLE IF NOT EXISTS public.analises_risco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  atividade TEXT NOT NULL,
  local_setor TEXT,
  data_analise DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel TEXT NOT NULL,
  perigo TEXT NOT NULL,
  risco TEXT NOT NULL,
  probabilidade SMALLINT NOT NULL DEFAULT 3 CHECK (probabilidade BETWEEN 1 AND 5),
  severidade SMALLINT NOT NULL DEFAULT 3 CHECK (severidade BETWEEN 1 AND 5),
  grau_risco SMALLINT NOT NULL DEFAULT 9,
  classificacao TEXT NOT NULL DEFAULT 'MEDIO' CHECK (classificacao IN ('NEGLIGENCIAVEL','BAIXO','MEDIO','ALTO','CRITICO')),
  medidas_controle TEXT,
  responsavel_acao TEXT,
  prazo_acao DATE,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EM_ANDAMENTO','CONCLUIDO','CANCELADO')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analises_risco_empresa ON public.analises_risco(empresa_id);
CREATE INDEX IF NOT EXISTS idx_analises_risco_classificacao ON public.analises_risco(classificacao);
CREATE INDEX IF NOT EXISTS idx_analises_risco_status ON public.analises_risco(status);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_analises_risco_updated_at') THEN
    CREATE TRIGGER update_analises_risco_updated_at BEFORE UPDATE ON public.analises_risco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.analises_risco ENABLE ROW LEVEL SECURITY;
CREATE POLICY analises_risco_select ON public.analises_risco FOR SELECT USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY analises_risco_insert ON public.analises_risco FOR INSERT WITH CHECK (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY analises_risco_update ON public.analises_risco FOR UPDATE USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY analises_risco_delete ON public.analises_risco FOR DELETE USING (empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));
GRANT ALL ON public.analises_risco TO authenticated;
GRANT ALL ON public.analises_risco TO service_role;

NOTIFY pgrst, 'reload schema';