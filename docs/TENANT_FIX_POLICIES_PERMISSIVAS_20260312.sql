-- TENANT FIX: POLICIES PERMISSIVAS
-- Data: 2026-03-12
-- Objetivo: remover policies com USING/WITH CHECK = true e reforcar isolamento por empresa.

-- FASE 1: limpeza garantida das policies permissivas (nao depende de colunas/funcoes)
DO $$
BEGIN
  IF to_regclass('public.ai_root_cause_analysis') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view ai analysis" ON public.ai_root_cause_analysis';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create ai analysis" ON public.ai_root_cause_analysis';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete ai analysis" ON public.ai_root_cause_analysis';
  END IF;

  IF to_regclass('public.empresa_config') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS empresa_config_domain_lookup_public ON public.empresa_config';
  END IF;
END
$$;

-- FASE 2: compatibilidade de schema para aplicar policies estritas
DO $$
BEGIN
  IF to_regclass('public.ai_root_cause_analysis') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_root_cause_analysis'
        AND column_name = 'empresa_id'
    ) THEN
      ALTER TABLE public.ai_root_cause_analysis ADD COLUMN empresa_id uuid;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_ai_root_cause_analysis_empresa_id
      ON public.ai_root_cause_analysis (empresa_id);

    IF to_regclass('public.empresas') IS NOT NULL THEN
      BEGIN
        ALTER TABLE public.ai_root_cause_analysis
          ADD CONSTRAINT ai_root_cause_analysis_empresa_id_fkey
          FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;

      UPDATE public.ai_root_cause_analysis a
      SET empresa_id = COALESCE(
        a.empresa_id,
        (SELECT e.empresa_id FROM public.equipamentos e WHERE e.id = a.equipamento_id),
        (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
      )
      WHERE a.empresa_id IS NULL;
    END IF;

    IF to_regprocedure('public.get_current_empresa_id()') IS NOT NULL THEN
      ALTER TABLE public.ai_root_cause_analysis
        ALTER COLUMN empresa_id SET DEFAULT public.get_current_empresa_id();
    END IF;
  END IF;

  IF to_regclass('public.empresa_config') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'empresa_config'
        AND column_name = 'empresa_id'
    ) THEN
      ALTER TABLE public.empresa_config ADD COLUMN empresa_id uuid;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_empresa_config_empresa_id
      ON public.empresa_config (empresa_id);

    IF to_regclass('public.empresas') IS NOT NULL THEN
      BEGIN
        ALTER TABLE public.empresa_config
          ADD CONSTRAINT empresa_config_empresa_id_fkey
          FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;

      UPDATE public.empresa_config
      SET empresa_id = COALESCE(
        empresa_id,
        (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
      )
      WHERE empresa_id IS NULL;
    END IF;

    IF to_regprocedure('public.get_current_empresa_id()') IS NOT NULL THEN
      ALTER TABLE public.empresa_config
        ALTER COLUMN empresa_id SET DEFAULT public.get_current_empresa_id();
    END IF;
  END IF;
END
$$;

-- FASE 3: policies estritas (condicional por funcoes disponiveis)
DO $$
DECLARE
  v_has_get_current boolean := (to_regprocedure('public.get_current_empresa_id()') IS NOT NULL);
  v_has_empresa_active boolean := (to_regprocedure('public.empresa_is_active(uuid)') IS NOT NULL);
  v_has_master_ti boolean := (to_regprocedure('public.is_master_ti()') IS NOT NULL);
BEGIN
  IF to_regclass('public.ai_root_cause_analysis') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON public.ai_root_cause_analysis';
    EXECUTE 'DROP POLICY IF EXISTS master_ti_global_access ON public.ai_root_cause_analysis';

    IF v_has_get_current THEN
      IF v_has_empresa_active THEN
        EXECUTE 'CREATE POLICY tenant_isolation ON public.ai_root_cause_analysis FOR ALL TO authenticated USING (empresa_id = public.get_current_empresa_id() AND public.empresa_is_active(empresa_id)) WITH CHECK (empresa_id = public.get_current_empresa_id() AND public.empresa_is_active(empresa_id))';
      ELSE
        EXECUTE 'CREATE POLICY tenant_isolation ON public.ai_root_cause_analysis FOR ALL TO authenticated USING (empresa_id = public.get_current_empresa_id()) WITH CHECK (empresa_id = public.get_current_empresa_id())';
      END IF;
    ELSE
      RAISE NOTICE 'get_current_empresa_id() ausente: policy tenant_isolation nao foi criada para ai_root_cause_analysis';
    END IF;

    IF v_has_master_ti THEN
      EXECUTE 'CREATE POLICY master_ti_global_access ON public.ai_root_cause_analysis FOR ALL TO authenticated USING (public.is_master_ti()) WITH CHECK (public.is_master_ti())';
    END IF;
  END IF;

  IF to_regclass('public.empresa_config') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS empresa_config_tenant_or_master ON public.empresa_config';

    IF v_has_get_current THEN
      IF v_has_empresa_active AND v_has_master_ti THEN
        EXECUTE 'CREATE POLICY empresa_config_tenant_or_master ON public.empresa_config FOR ALL TO authenticated USING ((empresa_id = public.get_current_empresa_id() AND public.empresa_is_active(empresa_id)) OR public.is_master_ti()) WITH CHECK ((empresa_id = public.get_current_empresa_id() AND public.empresa_is_active(empresa_id)) OR public.is_master_ti())';
      ELSIF v_has_master_ti THEN
        EXECUTE 'CREATE POLICY empresa_config_tenant_or_master ON public.empresa_config FOR ALL TO authenticated USING ((empresa_id = public.get_current_empresa_id()) OR public.is_master_ti()) WITH CHECK ((empresa_id = public.get_current_empresa_id()) OR public.is_master_ti())';
      ELSE
        EXECUTE 'CREATE POLICY empresa_config_tenant_or_master ON public.empresa_config FOR ALL TO authenticated USING (empresa_id = public.get_current_empresa_id()) WITH CHECK (empresa_id = public.get_current_empresa_id())';
      END IF;
    ELSE
      RAISE NOTICE 'get_current_empresa_id() ausente: policy tenant para empresa_config nao foi criada';
    END IF;
  END IF;
END
$$;

-- POS-VALIDACAO RECOMENDADA:
-- 1) Reexecutar docs/TENANT_VALIDACAO_OPERACIONAL_20260312.sql (etapa 6 deve voltar vazia)
-- 2) Validar login/fluxo de branding por dominio custom. Caso exista dependencia publica de empresa_config,
--    migrar lookup para Edge Function dedicada sem abrir SELECT publico na tabela base.
