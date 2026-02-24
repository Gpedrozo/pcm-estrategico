
-- Atividades de planos preventivos
CREATE TABLE public.atividades_preventivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  responsavel VARCHAR,
  ordem INTEGER NOT NULL DEFAULT 1,
  tempo_total_min INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atividades_preventivas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver atividades" ON public.atividades_preventivas FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar atividades" ON public.atividades_preventivas FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar atividades" ON public.atividades_preventivas FOR UPDATE USING (true);
CREATE POLICY "Usuarios autenticados podem deletar atividades" ON public.atividades_preventivas FOR DELETE USING (true);

-- Serviços de atividades preventivas
CREATE TABLE public.servicos_preventivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atividade_id UUID NOT NULL REFERENCES public.atividades_preventivas(id) ON DELETE CASCADE,
  descricao VARCHAR NOT NULL,
  tempo_estimado_min INTEGER NOT NULL DEFAULT 10,
  ordem INTEGER NOT NULL DEFAULT 1,
  concluido BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos_preventivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver servicos" ON public.servicos_preventivos FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar servicos" ON public.servicos_preventivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar servicos" ON public.servicos_preventivos FOR UPDATE USING (true);
CREATE POLICY "Usuarios autenticados podem deletar servicos" ON public.servicos_preventivos FOR DELETE USING (true);

-- Templates reutilizáveis
CREATE TABLE public.templates_preventivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  estrutura JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.templates_preventivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver templates" ON public.templates_preventivos FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar templates" ON public.templates_preventivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar templates" ON public.templates_preventivos FOR UPDATE USING (true);
CREATE POLICY "Usuarios autenticados podem deletar templates" ON public.templates_preventivos FOR DELETE USING (true);

-- Histórico de execuções preventivas
CREATE TABLE public.execucoes_preventivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.planos_preventivos(id) ON DELETE CASCADE,
  executor_nome VARCHAR NOT NULL,
  executor_id UUID,
  data_execucao TIMESTAMPTZ NOT NULL DEFAULT now(),
  tempo_real_min INTEGER,
  status VARCHAR NOT NULL DEFAULT 'EM_ANDAMENTO',
  checklist JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  os_gerada_id UUID REFERENCES public.ordens_servico(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execucoes_preventivas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver execucoes prev" ON public.execucoes_preventivas FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados podem criar execucoes prev" ON public.execucoes_preventivas FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar execucoes prev" ON public.execucoes_preventivas FOR UPDATE USING (true);

-- Add responsavel column to planos_preventivos if not exists
ALTER TABLE public.planos_preventivos ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR;

-- Triggers for updated_at
CREATE TRIGGER update_atividades_preventivas_updated_at BEFORE UPDATE ON public.atividades_preventivas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servicos_preventivos_updated_at BEFORE UPDATE ON public.servicos_preventivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_preventivos_updated_at BEFORE UPDATE ON public.templates_preventivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_execucoes_preventivas_updated_at BEFORE UPDATE ON public.execucoes_preventivas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_atividades_preventivas AFTER INSERT OR UPDATE OR DELETE ON public.atividades_preventivas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_servicos_preventivos AFTER INSERT OR UPDATE OR DELETE ON public.servicos_preventivos FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_templates_preventivos AFTER INSERT OR UPDATE OR DELETE ON public.templates_preventivos FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_execucoes_preventivas AFTER INSERT OR UPDATE OR DELETE ON public.execucoes_preventivas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
