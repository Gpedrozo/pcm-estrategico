-- ============================================================
-- Tabela para controle de versão do app mecânico
-- O gestor atualiza a versão aqui; o app compara e mostra alerta
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_versao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma text NOT NULL DEFAULT 'android',
  versao_atual text NOT NULL DEFAULT '1.0.0',
  versao_minima text NOT NULL DEFAULT '1.0.0',
  url_download text,
  notas text,
  forcar_atualizacao boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_versao_plataforma_key UNIQUE (plataforma)
);

-- Inserir registro inicial para Android
INSERT INTO public.app_versao (plataforma, versao_atual, versao_minima, url_download, notas, forcar_atualizacao)
VALUES (
  'android',
  '1.0.0',
  '1.0.0',
  NULL,
  'Versão inicial',
  false
)
ON CONFLICT (plataforma) DO NOTHING;

-- RLS: leitura pública (anon e authenticated), escrita restrita a admins
ALTER TABLE public.app_versao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_versao_select ON public.app_versao;
CREATE POLICY app_versao_select ON public.app_versao
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS app_versao_update ON public.app_versao;
CREATE POLICY app_versao_update ON public.app_versao
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'SUPER_ADMIN')
    )
  );
