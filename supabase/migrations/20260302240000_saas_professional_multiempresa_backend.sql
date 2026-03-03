BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_ADMIN';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'OWNER';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'MANAGER';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'PLANNER';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'TECHNICIAN';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'VIEWER';
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE public.app_role AS ENUM (
      'USUARIO',
      'ADMIN',
      'MASTER_TI',
      'SYSTEM_OWNER',
      'SYSTEM_ADMIN',
      'OWNER',
      'MANAGER',
      'PLANNER',
      'TECHNICIAN',
      'VIEWER'
    );
END;
$$;

CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  limite_usuarios integer NOT NULL DEFAULT 5,
  limite_os_mes integer NOT NULL DEFAULT 200,
  limite_ativos integer NOT NULL DEFAULT 500,
  limite_storage_mb integer NOT NULL DEFAULT 1024,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','suspended')),
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY,
  email text,
  nome text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_login_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membros_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','inactive','blocked')),
  cargo text,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text,
  escopo text NOT NULL DEFAULT 'tenant' CHECK (escopo IN ('global', 'tenant')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permissao_codigo text NOT NULL REFERENCES public.permissoes(codigo) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permissao_codigo)
);

CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  empresas_ativas integer NOT NULL DEFAULT 0,
  usuarios_ativos integer NOT NULL DEFAULT 0,
  os_abertas integer NOT NULL DEFAULT 0,
  os_fechadas integer NOT NULL DEFAULT 0,
  mtbf_horas numeric(14,4),
  mttr_horas numeric(14,4),
  disponibilidade_pct numeric(8,4),
  backlog_horas numeric(14,2),
  cumprimento_plano_pct numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_date)
);

CREATE TABLE IF NOT EXISTS public.system_owner_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.localizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  parent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.ativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  localizacao_id uuid REFERENCES public.localizacoes(id) ON DELETE SET NULL,
  tag text NOT NULL,
  nome text NOT NULL,
  criticidade text,
  status text NOT NULL DEFAULT 'ativo',
  data_instalacao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tag)
);

CREATE TABLE IF NOT EXISTS public.tags_ativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo_id uuid NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  tag text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tag)
);

CREATE TABLE IF NOT EXISTS public.planos_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  periodicidade_dias integer,
  proxima_execucao date,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.tarefas_plano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_manutencao(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 1,
  tempo_estimado_min integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES public.planos_manutencao(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  nome text NOT NULL,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historico_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  descricao text,
  data_evento timestamptz NOT NULL DEFAULT now(),
  custo_total numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.falhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  severidade text,
  ocorrencia_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.causas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  falha_id uuid NOT NULL REFERENCES public.falhas(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indicadores_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  referencia date NOT NULL,
  mtbf_horas numeric(14,4),
  mttr_horas numeric(14,4),
  disponibilidade_pct numeric(8,4),
  backlog_horas numeric(14,2),
  cumprimento_plano_pct numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, referencia)
);

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos(id),
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_email text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'db_trigger',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info';

INSERT INTO public.planos (codigo, nome, descricao, limite_usuarios, limite_os_mes, limite_ativos, limite_storage_mb, features)
VALUES
  ('FREE', 'Free', 'Plano gratuito para avaliação', 3, 100, 150, 512, '{"multi_unidade":false,"api":false}'::jsonb),
  ('STARTER', 'Starter', 'Plano inicial para pequenas operações', 15, 1500, 3000, 5120, '{"multi_unidade":true,"api":false}'::jsonb),
  ('PRO', 'Pro', 'Plano profissional para operação de médio porte', 80, 10000, 25000, 25600, '{"multi_unidade":true,"api":true}'::jsonb),
  ('ENTERPRISE', 'Enterprise', 'Plano corporativo sem limites rígidos', 1000, 1000000, 1000000, 512000, '{"multi_unidade":true,"api":true,"sso":true}'::jsonb)
ON CONFLICT (codigo) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  limite_usuarios = EXCLUDED.limite_usuarios,
  limite_os_mes = EXCLUDED.limite_os_mes,
  limite_ativos = EXCLUDED.limite_ativos,
  limite_storage_mb = EXCLUDED.limite_storage_mb,
  features = EXCLUDED.features,
  updated_at = now();

INSERT INTO public.permissoes (codigo, descricao, escopo)
VALUES
  ('platform.read', 'Ler dados globais da plataforma', 'global'),
  ('platform.write', 'Administrar dados globais da plataforma', 'global'),
  ('platform.billing', 'Administrar billing/plano global', 'global'),
  ('company.read', 'Ler dados da empresa', 'tenant'),
  ('company.write', 'Editar dados da empresa', 'tenant'),
  ('users.manage', 'Gerenciar usuários da empresa', 'tenant'),
  ('assets.manage', 'Gerenciar ativos/tags', 'tenant'),
  ('os.open', 'Abrir ordem de serviço', 'tenant'),
  ('os.execute', 'Executar ordem de serviço', 'tenant'),
  ('os.close', 'Fechar ordem de serviço', 'tenant'),
  ('preventive.manage', 'Gerenciar manutenção preventiva', 'tenant'),
  ('kpi.read', 'Ler indicadores da empresa', 'tenant'),
  ('audit.read', 'Ler auditoria da empresa', 'tenant')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.role_permissions (role, permissao_codigo)
VALUES
  ('SYSTEM_OWNER', 'platform.read'),
  ('SYSTEM_OWNER', 'platform.write'),
  ('SYSTEM_OWNER', 'platform.billing'),
  ('SYSTEM_OWNER', 'company.read'),
  ('SYSTEM_OWNER', 'company.write'),
  ('SYSTEM_OWNER', 'users.manage'),
  ('SYSTEM_OWNER', 'assets.manage'),
  ('SYSTEM_OWNER', 'os.open'),
  ('SYSTEM_OWNER', 'os.execute'),
  ('SYSTEM_OWNER', 'os.close'),
  ('SYSTEM_OWNER', 'preventive.manage'),
  ('SYSTEM_OWNER', 'kpi.read'),
  ('SYSTEM_OWNER', 'audit.read'),

  ('SYSTEM_ADMIN', 'platform.read'),
  ('SYSTEM_ADMIN', 'company.read'),
  ('SYSTEM_ADMIN', 'company.write'),
  ('SYSTEM_ADMIN', 'users.manage'),
  ('SYSTEM_ADMIN', 'kpi.read'),

  ('OWNER', 'company.read'),
  ('OWNER', 'company.write'),
  ('OWNER', 'users.manage'),
  ('OWNER', 'assets.manage'),
  ('OWNER', 'os.open'),
  ('OWNER', 'os.execute'),
  ('OWNER', 'os.close'),
  ('OWNER', 'preventive.manage'),
  ('OWNER', 'kpi.read'),
  ('OWNER', 'audit.read'),

  ('MANAGER', 'company.read'),
  ('MANAGER', 'users.manage'),
  ('MANAGER', 'assets.manage'),
  ('MANAGER', 'os.open'),
  ('MANAGER', 'os.execute'),
  ('MANAGER', 'os.close'),
  ('MANAGER', 'preventive.manage'),
  ('MANAGER', 'kpi.read'),
  ('MANAGER', 'audit.read'),

  ('PLANNER', 'company.read'),
  ('PLANNER', 'assets.manage'),
  ('PLANNER', 'os.open'),
  ('PLANNER', 'preventive.manage'),
  ('PLANNER', 'kpi.read'),

  ('TECHNICIAN', 'company.read'),
  ('TECHNICIAN', 'os.execute'),
  ('TECHNICIAN', 'os.close'),

  ('VIEWER', 'company.read'),
  ('VIEWER', 'kpi.read')
ON CONFLICT (role, permissao_codigo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_system_operator(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = COALESCE(p_user_id, auth.uid())
      AND ur.role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_empresa(p_empresa_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(public.is_system_operator(COALESCE(p_user_id, auth.uid())), false)
    OR EXISTS (
      SELECT 1
      FROM public.membros_empresa me
      WHERE me.empresa_id = p_empresa_id
        AND me.user_id = COALESCE(p_user_id, auth.uid())
        AND me.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.empresa_id = p_empresa_id
        AND ur.user_id = COALESCE(p_user_id, auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.has_permission_v2(p_permission text, p_empresa_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rp.permissao_codigo = p_permission
      AND (
        public.is_system_operator(auth.uid())
        OR p_empresa_id IS NULL
        OR ur.empresa_id = p_empresa_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
    (SELECT me.empresa_id FROM public.membros_empresa me WHERE me.user_id = auth.uid() AND me.status = 'active' ORDER BY me.created_at LIMIT 1),
    (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() ORDER BY ur.created_at LIMIT 1),
    (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.audit_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_record_id text;
BEGIN
  v_empresa_id := COALESCE(
    NULLIF(COALESCE(to_jsonb(NEW) ->> 'empresa_id', to_jsonb(OLD) ->> 'empresa_id'), '')::uuid,
    public.current_empresa_id()
  );

  v_record_id := COALESCE(to_jsonb(NEW) ->> 'id', to_jsonb(OLD) ->> 'id');

  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    empresa_id,
    actor_user_id,
    actor_email,
    metadata,
    source,
    severity,
    created_at
  )
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_empresa_id,
    auth.uid(),
    auth.jwt() ->> 'email',
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    'trigger',
    'info',
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'ordens_servico',
    'execucoes_os',
    'planos_manutencao',
    'tarefas_plano',
    'ativos',
    'tags_ativos',
    'historico_manutencao',
    'falhas',
    'causas',
    'membros_empresa',
    'assinaturas'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', v_table, v_table);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_change()', v_table, v_table);
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'unidades','localizacoes','ativos','tags_ativos','planos_manutencao','tarefas_plano','checklists',
    'ordens_servico','execucoes_os','historico_manutencao','falhas','causas','acoes_corretivas','indicadores_kpi',
    'membros_empresa','assinaturas','usuarios','materiais','planos_preventivos','execucoes_preventivas',
    'medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','melhorias','fornecedores','contratos'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = v_table
          AND column_name = 'empresa_id'
      ) THEN
        EXECUTE format('DROP POLICY IF EXISTS saas_tenant_select ON public.%I', v_table);
        EXECUTE format('DROP POLICY IF EXISTS saas_tenant_write ON public.%I', v_table);
        EXECUTE format('CREATE POLICY saas_tenant_select ON public.%I FOR SELECT USING (public.can_access_empresa(empresa_id))', v_table);
        EXECUTE format('CREATE POLICY saas_tenant_write ON public.%I FOR ALL USING (public.can_access_empresa(empresa_id)) WITH CHECK (public.can_access_empresa(empresa_id))', v_table);
      ELSE
        EXECUTE format('DROP POLICY IF EXISTS saas_platform_select ON public.%I', v_table);
        EXECUTE format('DROP POLICY IF EXISTS saas_platform_write ON public.%I', v_table);
        EXECUTE format('CREATE POLICY saas_platform_select ON public.%I FOR SELECT USING (public.is_system_operator(auth.uid()))', v_table);
        EXECUTE format('CREATE POLICY saas_platform_write ON public.%I FOR ALL USING (public.is_system_operator(auth.uid())) WITH CHECK (public.is_system_operator(auth.uid()))', v_table);
      END IF;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.system_owner_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_allowlist_system_owner_select ON public.system_owner_allowlist;
DROP POLICY IF EXISTS owner_allowlist_system_owner_write ON public.system_owner_allowlist;
CREATE POLICY owner_allowlist_system_owner_select ON public.system_owner_allowlist
  FOR SELECT USING (public.is_system_operator(auth.uid()));
CREATE POLICY owner_allowlist_system_owner_write ON public.system_owner_allowlist
  FOR ALL USING (public.is_system_operator(auth.uid())) WITH CHECK (public.is_system_operator(auth.uid()));

ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_metrics_system_select ON public.platform_metrics;
DROP POLICY IF EXISTS platform_metrics_system_write ON public.platform_metrics;
CREATE POLICY platform_metrics_system_select ON public.platform_metrics
  FOR SELECT USING (public.is_system_operator(auth.uid()));
CREATE POLICY platform_metrics_system_write ON public.platform_metrics
  FOR ALL USING (public.is_system_operator(auth.uid())) WITH CHECK (public.is_system_operator(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_membros_empresa_empresa_user_status ON public.membros_empresa (empresa_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_empresa_role ON public.user_roles (user_id, empresa_id, role);
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa_status ON public.assinaturas (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_status_created ON public.ordens_servico (empresa_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_planos_manutencao_empresa_status ON public.planos_manutencao (empresa_id, status, proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_ativos_empresa_status ON public.ativos (empresa_id, status, tag);
CREATE INDEX IF NOT EXISTS idx_historico_manutencao_empresa_data ON public.historico_manutencao (empresa_id, data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_indicadores_kpi_empresa_ref ON public.indicadores_kpi (empresa_id, referencia DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created ON public.audit_logs (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs (actor_user_id, created_at DESC);

COMMIT;
