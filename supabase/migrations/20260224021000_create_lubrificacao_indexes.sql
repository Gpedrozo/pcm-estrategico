-- Índices para acelerar consultas de lubrificação

CREATE INDEX IF NOT EXISTS idx_planos_lubrificacao_codigo ON public.planos_lubrificacao (codigo);
CREATE INDEX IF NOT EXISTS idx_planos_lubrificacao_proxima_execucao ON public.planos_lubrificacao (proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_execucoes_lubrificacao_plano_id ON public.execucoes_lubrificacao (plano_id);
CREATE INDEX IF NOT EXISTS idx_atividades_lubrificacao_plano_id ON public.atividades_lubrificacao (plano_id);
