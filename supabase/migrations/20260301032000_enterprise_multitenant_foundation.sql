-- Enterprise multi-tenant foundation hardening

-- 1) Tenant registry
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dados_empresa') THEN
    INSERT INTO public.empresas (id, nome)
    SELECT d.id, COALESCE(NULLIF(d.nome_fantasia, ''), d.razao_social)
    FROM public.dados_empresa d
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.empresas) THEN
    INSERT INTO public.empresas (nome) VALUES ('Empresa Padrao');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  BEGIN
    v_empresa_id := NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  SELECT p.empresa_id INTO v_empresa_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN v_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_master_ti()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'MASTER_TI'::public.app_role), false);
$$;

-- 2) Standardize profile and roles tenancy anchors
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET empresa_id = COALESCE(empresa_id, (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1));

ALTER TABLE public.profiles ALTER COLUMN empresa_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON public.profiles (empresa_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_empresa_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;
END $$;

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS empresa_id uuid;

UPDATE public.user_roles ur
SET empresa_id = p.empresa_id
FROM public.profiles p
WHERE p.id = ur.user_id
  AND ur.empresa_id IS NULL;

UPDATE public.user_roles
SET empresa_id = (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
WHERE empresa_id IS NULL;

ALTER TABLE public.user_roles ALTER COLUMN empresa_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_empresa_id ON public.user_roles (empresa_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_empresa_id_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;
END $$;

-- 3) Add empresa_id to operational tables
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'areas','auditoria','equipamentos','execucoes_os','materiais','materiais_os','mecanicos','movimentacoes_materiais','ordens_servico','plantas','sistemas',
    'solicitacoes_manutencao','planos_preventivos','medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema','componentes_equipamento',
    'atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'document_sequences','document_layouts','ai_root_cause_analysis','permissoes_granulares','security_logs','rate_limits','dados_empresa'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id uuid', v_table);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_empresa_id ON public.%I (empresa_id)', v_table, v_table);

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = format('%s_empresa_id_fkey', v_table)
          AND conrelid = format('public.%I', v_table)::regclass
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)', v_table, format('%s_empresa_id_fkey', v_table));
      END IF;
    END IF;
  END LOOP;
END $$;

-- 4) Safe backfill, prioritizing creator/relationship links
UPDATE public.ordens_servico os
SET empresa_id = p.empresa_id
FROM public.profiles p
WHERE p.id = os.usuario_abertura
  AND os.empresa_id IS NULL;

UPDATE public.movimentacoes_materiais mm
SET empresa_id = p.empresa_id
FROM public.profiles p
WHERE p.id = mm.usuario_id
  AND mm.empresa_id IS NULL;

UPDATE public.auditoria a
SET empresa_id = p.empresa_id
FROM public.profiles p
WHERE p.id = a.usuario_id
  AND a.empresa_id IS NULL;

UPDATE public.permissoes_granulares pg
SET empresa_id = p.empresa_id
FROM public.profiles p
WHERE p.id = pg.user_id
  AND pg.empresa_id IS NULL;

UPDATE public.plantas SET empresa_id = COALESCE(empresa_id, (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1));
UPDATE public.areas a SET empresa_id = p.empresa_id FROM public.plantas p WHERE p.id = a.planta_id AND a.empresa_id IS NULL;
UPDATE public.sistemas s SET empresa_id = a.empresa_id FROM public.areas a WHERE a.id = s.area_id AND s.empresa_id IS NULL;
UPDATE public.equipamentos e SET empresa_id = s.empresa_id FROM public.sistemas s WHERE s.id = e.sistema_id AND e.empresa_id IS NULL;
UPDATE public.equipamentos e SET empresa_id = os.empresa_id FROM public.ordens_servico os WHERE os.tag = e.tag AND e.empresa_id IS NULL;

UPDATE public.execucoes_os eo SET empresa_id = os.empresa_id FROM public.ordens_servico os WHERE os.id = eo.os_id AND eo.empresa_id IS NULL;
UPDATE public.materiais_os mo SET empresa_id = os.empresa_id FROM public.ordens_servico os WHERE os.id = mo.os_id AND mo.empresa_id IS NULL;
UPDATE public.movimentacoes_materiais mm SET empresa_id = os.empresa_id FROM public.ordens_servico os WHERE os.id = mm.os_id AND mm.empresa_id IS NULL;
UPDATE public.componentes_equipamento ce SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = ce.equipamento_id AND ce.empresa_id IS NULL;

UPDATE public.planos_preventivos pp SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = pp.equipamento_id AND pp.empresa_id IS NULL;
UPDATE public.atividades_preventivas ap SET empresa_id = pp.empresa_id FROM public.planos_preventivos pp WHERE pp.id = ap.plano_id AND ap.empresa_id IS NULL;
UPDATE public.servicos_preventivos sp SET empresa_id = ap.empresa_id FROM public.atividades_preventivas ap WHERE ap.id = sp.atividade_id AND sp.empresa_id IS NULL;
UPDATE public.execucoes_preventivas ep SET empresa_id = pp.empresa_id FROM public.planos_preventivos pp WHERE pp.id = ep.plano_id AND ep.empresa_id IS NULL;

UPDATE public.planos_lubrificacao pl SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = pl.equipamento_id AND pl.empresa_id IS NULL;
UPDATE public.atividades_lubrificacao al SET empresa_id = pl.empresa_id FROM public.planos_lubrificacao pl WHERE pl.id = al.plano_id AND al.empresa_id IS NULL;
UPDATE public.execucoes_lubrificacao el SET empresa_id = pl.empresa_id FROM public.planos_lubrificacao pl WHERE pl.id = el.plano_id AND el.empresa_id IS NULL;

UPDATE public.solicitacoes_manutencao sm SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = sm.equipamento_id AND sm.empresa_id IS NULL;
UPDATE public.medicoes_preditivas mp SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = mp.equipamento_id AND mp.empresa_id IS NULL;
UPDATE public.inspecoes i SET empresa_id = p.empresa_id FROM public.profiles p WHERE p.id = i.inspetor_id AND i.empresa_id IS NULL;
UPDATE public.anomalias_inspecao ai SET empresa_id = i.empresa_id FROM public.inspecoes i WHERE i.id = ai.inspecao_id AND ai.empresa_id IS NULL;
UPDATE public.fmea f SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = f.equipamento_id AND f.empresa_id IS NULL;
UPDATE public.analise_causa_raiz r SET empresa_id = os.empresa_id FROM public.ordens_servico os WHERE os.id = r.os_id AND r.empresa_id IS NULL;
UPDATE public.acoes_corretivas ac SET empresa_id = r.empresa_id FROM public.analise_causa_raiz r WHERE r.id = ac.rca_id AND ac.empresa_id IS NULL;
UPDATE public.melhorias m SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = m.equipamento_id AND m.empresa_id IS NULL;
UPDATE public.contratos c SET empresa_id = f.empresa_id FROM public.fornecedores f WHERE f.id = c.fornecedor_id AND c.empresa_id IS NULL;
UPDATE public.avaliacoes_fornecedores af SET empresa_id = c.empresa_id FROM public.contratos c WHERE c.id = af.contrato_id AND af.empresa_id IS NULL;
UPDATE public.permissoes_trabalho pt SET empresa_id = os.empresa_id FROM public.ordens_servico os WHERE os.id = pt.os_id AND pt.empresa_id IS NULL;
UPDATE public.incidentes_ssma iss SET empresa_id = r.empresa_id FROM public.analise_causa_raiz r WHERE r.id = iss.rca_id AND iss.empresa_id IS NULL;
UPDATE public.documentos_tecnicos dt SET empresa_id = e.empresa_id FROM public.equipamentos e WHERE e.id = dt.equipamento_id AND dt.empresa_id IS NULL;

DO $$
DECLARE
  v_table text;
  v_null_count bigint;
  v_tables text[] := ARRAY[
    'areas','auditoria','equipamentos','execucoes_os','materiais','materiais_os','mecanicos','movimentacoes_materiais','ordens_servico','plantas','sistemas',
    'solicitacoes_manutencao','planos_preventivos','medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema','componentes_equipamento',
    'atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'document_sequences','document_layouts','ai_root_cause_analysis','permissoes_granulares','security_logs','rate_limits','dados_empresa'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      EXECUTE format('UPDATE public.%I SET empresa_id = COALESCE(empresa_id, (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1))', v_table);
      EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE empresa_id IS NULL', v_table) INTO v_null_count;
      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Inconsistencia detectada: % ainda possui % linhas sem empresa_id. Corrija antes de aplicar NOT NULL.', v_table, v_null_count;
      END IF;
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET DEFAULT public.get_current_empresa_id()', v_table);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL', v_table);
    END IF;
  END LOOP;
END $$;

-- 5) RLS hardening and master override policy
DO $$
DECLARE
  v_table text;
  v_policy record;
  v_tables text[] := ARRAY[
    'areas','auditoria','equipamentos','execucoes_os','materiais','materiais_os','mecanicos','movimentacoes_materiais','ordens_servico','plantas','sistemas',
    'solicitacoes_manutencao','planos_preventivos','medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema','componentes_equipamento',
    'atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'document_sequences','document_layouts','ai_root_cause_analysis','permissoes_granulares','security_logs','rate_limits','dados_empresa','profiles','user_roles'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      FOR v_policy IN
        SELECT polname
        FROM pg_policy
        WHERE polrelid = format('public.%I', v_table)::regclass
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.polname, v_table);
      END LOOP;

      EXECUTE format('CREATE POLICY tenant_select ON public.%I FOR SELECT USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT WITH CHECK (public.is_master_ti() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id()) WITH CHECK (public.is_master_ti() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id())', v_table);
    END IF;
  END LOOP;
END $$;

-- 6) Protection triggers and enterprise audit logs
CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enterprise_audit_logs_select" ON public.enterprise_audit_logs;
DROP POLICY IF EXISTS "enterprise_audit_logs_insert" ON public.enterprise_audit_logs;

CREATE POLICY "enterprise_audit_logs_select" ON public.enterprise_audit_logs
  FOR SELECT USING (public.is_master_ti() OR empresa_id = public.get_current_empresa_id());

CREATE POLICY "enterprise_audit_logs_insert" ON public.enterprise_audit_logs
  FOR INSERT WITH CHECK (public.is_master_ti() OR empresa_id = public.get_current_empresa_id());

CREATE OR REPLACE FUNCTION public.enforce_empresa_id_protection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id e obrigatorio em %', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Alteracao manual de empresa_id nao permitida em % (tentativa: % -> %)', TG_TABLE_NAME, OLD.empresa_id, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_enterprise_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_record_id text;
BEGIN
  v_record_id := COALESCE(NEW.id::text, OLD.id::text, NULL);

  INSERT INTO public.enterprise_audit_logs (empresa_id, table_name, operation, record_id, actor_id, old_data, new_data)
  VALUES (
    COALESCE(NEW.empresa_id, OLD.empresa_id),
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_cross_tenant_access(p_table text, p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF public.is_master_ti() THEN
    RETURN false;
  END IF;

  RETURN p_empresa_id IS DISTINCT FROM public.get_current_empresa_id();
END;
$$;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'areas','auditoria','equipamentos','execucoes_os','materiais','materiais_os','mecanicos','movimentacoes_materiais','ordens_servico','plantas','sistemas',
    'solicitacoes_manutencao','planos_preventivos','medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema','componentes_equipamento',
    'atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'document_sequences','document_layouts','ai_root_cause_analysis','permissoes_granulares','security_logs','rate_limits','dados_empresa'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_empresa_id ON public.%I', v_table);
      EXECUTE format('CREATE TRIGGER trg_enforce_empresa_id BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_empresa_id_protection()', v_table);

      EXECUTE format('DROP TRIGGER IF EXISTS trg_enterprise_audit ON public.%I', v_table);
      EXECUTE format('CREATE TRIGGER trg_enterprise_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_audit()', v_table);
    END IF;
  END LOOP;
END $$;

-- 7) Role hardening to block unauthorized promotion
CREATE OR REPLACE FUNCTION public.prevent_master_ti_promotion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'MASTER_TI'::public.app_role
     AND NOT public.is_master_ti()
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Somente MASTER_TI pode promover usuarios para MASTER_TI (tentativa de: %)', auth.uid();
  END IF;

  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_current_empresa_id();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_master_ti_promotion ON public.user_roles;
CREATE TRIGGER trg_prevent_master_ti_promotion
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_master_ti_promotion();

-- 8) Weekly integrity check function
CREATE OR REPLACE FUNCTION public.weekly_tenant_integrity_check()
RETURNS TABLE(table_name text, orphan_rows bigint, null_empresa_rows bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'areas','auditoria','equipamentos','execucoes_os','materiais','materiais_os','mecanicos','movimentacoes_materiais','ordens_servico','plantas','sistemas',
    'solicitacoes_manutencao','planos_preventivos','medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema','componentes_equipamento',
    'atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'document_sequences','document_layouts','ai_root_cause_analysis','permissoes_granulares','security_logs','rate_limits','dados_empresa','profiles','user_roles'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      RETURN QUERY EXECUTE format(
        'SELECT %L::text, COUNT(*) FILTER (WHERE e.id IS NULL)::bigint, COUNT(*) FILTER (WHERE t.empresa_id IS NULL)::bigint
         FROM public.%I t
         LEFT JOIN public.empresas e ON e.id = t.empresa_id',
         v_table, v_table
      );
    END IF;
  END LOOP;
END;
$$;
