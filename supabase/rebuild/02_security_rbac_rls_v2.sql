-- FASE 2 - SEGURANÇA / RBAC / RLS / RPC de auditoria

BEGIN;

-- Tipo app_role (caso não exista)
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Funções de apoio
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
    (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_control_plane_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT coalesce(public.has_role(auth.uid(), 'MASTER_TI'::public.app_role), false)
  OR coalesce(public.has_role(auth.uid(), 'SYSTEM_OWNER'::public.app_role), false)
  OR coalesce(public.has_role(auth.uid(), 'SYSTEM_ADMIN'::public.app_role), false);
$$;

-- RBAC tabelas
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role_id)
);

INSERT INTO public.rbac_roles (code, description, is_system)
VALUES
  ('USUARIO', 'Usuário padrão do tenant', true),
  ('ADMIN', 'Administrador do tenant', true),
  ('MASTER_TI', 'Operador técnico global', true),
  ('SYSTEM_OWNER', 'Control plane owner', true),
  ('SYSTEM_ADMIN', 'Administrador global da plataforma', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_permissions (code, description)
VALUES
  ('tenant.read', 'Ler recursos do tenant'),
  ('tenant.write', 'Escrever recursos do tenant'),
  ('tenant.admin', 'Administrar tenant'),
  ('control_plane.read', 'Ler control plane'),
  ('control_plane.write', 'Administrar control plane'),
  ('security.manage', 'Gerenciar segurança e auditoria'),
  ('billing.manage', 'Gerenciar billing')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON (
  (r.code = 'USUARIO' AND p.code IN ('tenant.read')) OR
  (r.code = 'ADMIN' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin')) OR
  (r.code = 'MASTER_TI' AND p.code IN ('tenant.read', 'tenant.write', 'control_plane.read', 'security.manage')) OR
  (r.code = 'SYSTEM_ADMIN' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin', 'control_plane.read', 'control_plane.write', 'security.manage', 'billing.manage')) OR
  (r.code = 'SYSTEM_OWNER' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin', 'control_plane.read', 'control_plane.write', 'security.manage', 'billing.manage'))
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(
  p_permission_code text,
  p_empresa_id uuid DEFAULT public.get_current_empresa_id()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_roles uur
    JOIN public.rbac_role_permissions urp ON urp.role_id = uur.role_id
    JOIN public.rbac_permissions p ON p.id = urp.permission_id
    WHERE uur.user_id = auth.uid()
      AND p.code = p_permission_code
      AND (
        uur.empresa_id IS NULL
        OR uur.empresa_id = p_empresa_id
        OR public.is_control_plane_operator()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_action text,
  p_table text,
  p_record_id text DEFAULT NULL,
  p_empresa_id uuid DEFAULT public.get_current_empresa_id(),
  p_severity text DEFAULT 'info',
  p_source text DEFAULT 'app',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    empresa_id,
    severity,
    source,
    actor_user_id,
    actor_email,
    correlation_id,
    metadata,
    created_at
  )
  VALUES (
    p_action,
    p_table,
    p_record_id,
    p_empresa_id,
    p_severity,
    p_source,
    auth.uid(),
    auth.jwt() ->> 'email',
    p_correlation_id,
    p_metadata,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Trigger updated_at em lote
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'empresas','profiles','plantas','areas','sistemas','equipamentos','componentes_equipamento',
    'ordens_servico','mecanicos','materiais','planos_preventivos','atividades_preventivas','servicos_preventivos',
    'templates_preventivos','execucoes_preventivas','planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao',
    'medicoes_preditivas','inspecoes','anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias',
    'fornecedores','contratos','avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma',
    'documentos_tecnicos','configuracoes_sistema','dados_empresa','document_sequences','document_layouts',
    'permissoes_granulares'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_%I ON public.%I', v_table, v_table);
    EXECUTE format('CREATE TRIGGER trg_update_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', v_table, v_table);
  END LOOP;
END $$;

-- RLS padrão por tenant
DO $$
DECLARE
  v_table text;
  v_policy record;
  v_has_empresa_id boolean;
  v_tables text[] := ARRAY[
    'empresas','profiles','user_roles','plantas','areas','sistemas','equipamentos','componentes_equipamento',
    'ordens_servico','mecanicos','execucoes_os','materiais','materiais_os','movimentacoes_materiais',
    'planos_preventivos','atividades_preventivas','servicos_preventivos','templates_preventivos','execucoes_preventivas',
    'planos_lubrificacao','atividades_lubrificacao','execucoes_lubrificacao','medicoes_preditivas','inspecoes',
    'anomalias_inspecao','fmea','analise_causa_raiz','acoes_corretivas','melhorias','fornecedores','contratos',
    'avaliacoes_fornecedores','permissoes_trabalho','incidentes_ssma','documentos_tecnicos','configuracoes_sistema',
    'dados_empresa','document_sequences','document_layouts','permissoes_granulares','security_logs','rate_limits',
    'maintenance_schedule','audit_logs','enterprise_audit_logs','rbac_user_roles'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'empresa_id'
    ) INTO v_has_empresa_id;

    FOR v_policy IN
      SELECT polname
      FROM pg_policy
      WHERE polrelid = format('public.%I', v_table)::regclass
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.polname, v_table);
    END LOOP;

    IF v_has_empresa_id THEN
      EXECUTE format('CREATE POLICY tenant_select ON public.%I FOR SELECT USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id()) WITH CHECK (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
      EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE USING (public.is_control_plane_operator() OR empresa_id = public.get_current_empresa_id())', v_table);
    ELSE
      EXECUTE format('CREATE POLICY control_plane_select ON public.%I FOR SELECT USING (public.is_control_plane_operator())', v_table);
      EXECUTE format('CREATE POLICY control_plane_insert ON public.%I FOR INSERT WITH CHECK (public.is_control_plane_operator())', v_table);
      EXECUTE format('CREATE POLICY control_plane_update ON public.%I FOR UPDATE USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator())', v_table);
      EXECUTE format('CREATE POLICY control_plane_delete ON public.%I FOR DELETE USING (public.is_control_plane_operator())', v_table);
    END IF;
  END LOOP;
END $$;

-- RLS exclusivo control-plane para meta-RBAC
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rbac_roles_read ON public.rbac_roles;
DROP POLICY IF EXISTS rbac_roles_manage ON public.rbac_roles;
CREATE POLICY rbac_roles_read ON public.rbac_roles FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY rbac_roles_manage ON public.rbac_roles FOR ALL USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_permissions_read ON public.rbac_permissions;
DROP POLICY IF EXISTS rbac_permissions_manage ON public.rbac_permissions;
CREATE POLICY rbac_permissions_read ON public.rbac_permissions FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY rbac_permissions_manage ON public.rbac_permissions FOR ALL USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_role_permissions_read ON public.rbac_role_permissions;
DROP POLICY IF EXISTS rbac_role_permissions_manage ON public.rbac_role_permissions;
CREATE POLICY rbac_role_permissions_read ON public.rbac_role_permissions FOR SELECT USING (public.is_control_plane_operator());
CREATE POLICY rbac_role_permissions_manage ON public.rbac_role_permissions FOR ALL USING (public.is_control_plane_operator()) WITH CHECK (public.is_control_plane_operator());

-- Autoempresa: preenche empresa_id quando ausente e bloqueia troca entre tenants
CREATE OR REPLACE FUNCTION public.enforce_empresa_id_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_current_empresa_id();
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id is required';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_empresa_id_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Updating empresa_id is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND c.is_nullable = 'NO'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_empresa_id_insert ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER trg_enforce_empresa_id_insert BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_empresa_id_insert()', v_table);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_empresa_id_update ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER trg_block_empresa_id_update BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_empresa_id_update()', v_table);
  END LOOP;
END $$;

COMMIT;
