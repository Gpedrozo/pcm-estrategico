-- Criação das tabelas para o módulo de Lubrificação

-- Planos de lubrificação
CREATE TABLE IF NOT EXISTS public.planos_lubrificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR NOT NULL,
  nome VARCHAR NOT NULL,
  equipamento_id UUID,
  tag VARCHAR,
  localizacao VARCHAR,
  ponto VARCHAR,
  tipo_lubrificante VARCHAR,
  codigo_lubrificante VARCHAR,
  quantidade NUMERIC,
  ferramenta VARCHAR,
  periodicidade_tipo VARCHAR,
  periodicidade_valor INTEGER,
  tempo_estimado_min INTEGER NOT NULL DEFAULT 0,
  responsavel_nome VARCHAR,
  observacoes TEXT,
  nivel_criticidade VARCHAR,
  instrucoes TEXT,
  anexos JSONB,
  proxima_execucao TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planos_lubrificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver planos lubrificacao" ON public.planos_lubrificacao FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar planos lubrificacao" ON public.planos_lubrificacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar planos lubrificacao" ON public.planos_lubrificacao FOR UPDATE USING (true);
CREATE POLICY "Usuarios autenticados podem deletar planos lubrificacao" ON public.planos_lubrificacao FOR DELETE USING (true);

-- Atividades de lubrificação
CREATE TABLE IF NOT EXISTS public.atividades_lubrificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.planos_lubrificacao(id) ON DELETE CASCADE,
  descricao VARCHAR NOT NULL,
  tempo_estimado_min INTEGER,
  responsavel VARCHAR,
  tipo VARCHAR,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atividades_lubrificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver atividades lubrificacao" ON public.atividades_lubrificacao FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar atividades lubrificacao" ON public.atividades_lubrificacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar atividades lubrificacao" ON public.atividades_lubrificacao FOR UPDATE USING (true);
CREATE POLICY "Usuarios autenticados podem deletar atividades lubrificacao" ON public.atividades_lubrificacao FOR DELETE USING (true);

-- Execuções de lubrificação
CREATE TABLE IF NOT EXISTS public.execucoes_lubrificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.planos_lubrificacao(id) ON DELETE CASCADE,
  executor_id UUID,
  executor_nome VARCHAR,
  data_execucao TIMESTAMPTZ NOT NULL DEFAULT now(),
  tempo_real_min INTEGER,
  status VARCHAR NOT NULL DEFAULT 'PENDENTE',
  observacoes TEXT,
  fotos JSONB,
  quantidade_utilizada NUMERIC,
  os_gerada_id UUID REFERENCES public.ordens_servico(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execucoes_lubrificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver execucoes lubrificacao" ON public.execucoes_lubrificacao FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar execucoes lubrificacao" ON public.execucoes_lubrificacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar execucoes lubrificacao" ON public.execucoes_lubrificacao FOR UPDATE USING (true);

-- Triggers e auditoria
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_planos_lubrificacao_updated_at BEFORE UPDATE ON public.planos_lubrificacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
    EXECUTE 'CREATE TRIGGER update_atividades_lubrificacao_updated_at BEFORE UPDATE ON public.atividades_lubrificacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
    EXECUTE 'CREATE TRIGGER update_execucoes_lubrificacao_updated_at BEFORE UPDATE ON public.execucoes_lubrificacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'registrar_auditoria') THEN
    EXECUTE 'CREATE TRIGGER audit_planos_lubrificacao AFTER INSERT OR UPDATE OR DELETE ON public.planos_lubrificacao FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria()';
    EXECUTE 'CREATE TRIGGER audit_atividades_lubrificacao AFTER INSERT OR UPDATE OR DELETE ON public.atividades_lubrificacao FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria()';
    EXECUTE 'CREATE TRIGGER audit_execucoes_lubrificacao AFTER INSERT OR UPDATE OR DELETE ON public.execucoes_lubrificacao FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria()';
  END IF;
END$$;
