-- Multi-tenant base and enterprise audit hardening

CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view empresas" ON public.empresas;
CREATE POLICY "Authenticated users can view empresas" ON public.empresas
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and Masters can manage empresas" ON public.empresas;
CREATE POLICY "Admins and Masters can manage empresas" ON public.empresas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'MASTER_TI'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'MASTER_TI'::app_role));

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.empresas (nome, cnpj)
SELECT
  COALESCE(NULLIF(de.razao_social, ''), NULLIF(de.nome_fantasia, ''), 'Empresa Padrão'),
  NULLIF(de.cnpj, '')
FROM public.dados_empresa de
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.empresas (nome)
SELECT 'Empresa Padrão'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true;

UPDATE public.profiles
SET empresa_id = COALESCE(
  empresa_id,
  (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
)
WHERE empresa_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN empresa_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_empresa_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON public.profiles(empresa_id);

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  target_entity text NOT NULL,
  target_id text,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_id ON public.enterprise_audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_target ON public.enterprise_audit_logs(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_created_at ON public.enterprise_audit_logs(created_at DESC);

ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and Masters can view enterprise audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "Admins and Masters can view enterprise audit logs" ON public.enterprise_audit_logs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated users can insert enterprise audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "Authenticated users can insert enterprise audit logs" ON public.enterprise_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (executor_id IS NULL OR executor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_enterprise_event(
  p_target_entity text,
  p_target_id text,
  p_action text,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_executor_id uuid DEFAULT auth.uid(),
  p_empresa_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_empresa_id uuid;
BEGIN
  v_empresa_id := COALESCE(
    p_empresa_id,
    (SELECT empresa_id FROM public.profiles WHERE id = p_executor_id)
  );

  INSERT INTO public.enterprise_audit_logs (
    executor_id,
    empresa_id,
    target_entity,
    target_id,
    action,
    before,
    after,
    ip,
    user_agent
  )
  VALUES (
    p_executor_id,
    v_empresa_id,
    p_target_entity,
    p_target_id,
    p_action,
    p_before,
    p_after,
    p_ip,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_role app_role;
BEGIN
  v_empresa_id := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'empresa_id', '')::uuid,
    (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
  );

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id é obrigatório para criação de usuário';
  END IF;

  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::app_role,
    'USUARIO'::app_role
  );

  INSERT INTO public.profiles (id, nome, empresa_id, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nome', ''), NEW.email),
    v_empresa_id,
    true
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  PERFORM public.log_enterprise_event(
    'profiles',
    NEW.id::text,
    'CREATE_USER',
    NULL,
    jsonb_build_object(
      'id', NEW.id,
      'email', NEW.email,
      'empresa_id', v_empresa_id,
      'role', v_role,
      'must_change_password', true
    ),
    NULL,
    NULL,
    NEW.id,
    v_empresa_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.audit_enterprise_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_user_agent text;
  v_target_id text;
  v_empresa_id uuid;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := '{}'::jsonb;
  END;

  v_ip := COALESCE(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip');
  v_user_agent := v_headers ->> 'user-agent';

  v_target_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id::text ELSE NEW.user_id::text END
  );

  v_empresa_id := COALESCE(
    CASE
      WHEN TG_OP = 'DELETE' THEN NULLIF(to_jsonb(OLD) ->> 'empresa_id', '')::uuid
      ELSE NULLIF(to_jsonb(NEW) ->> 'empresa_id', '')::uuid
    END,
    (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  );

  PERFORM public.log_enterprise_event(
    TG_TABLE_NAME,
    v_target_id,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    v_ip,
    v_user_agent,
    auth.uid(),
    v_empresa_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_enterprise_profiles ON public.profiles;
CREATE TRIGGER audit_enterprise_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_changes();

DROP TRIGGER IF EXISTS audit_enterprise_user_roles ON public.user_roles;
CREATE TRIGGER audit_enterprise_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_changes();

DROP TRIGGER IF EXISTS audit_enterprise_empresas ON public.empresas;
CREATE TRIGGER audit_enterprise_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_changes();

DROP TRIGGER IF EXISTS audit_enterprise_dados_empresa ON public.dados_empresa;
CREATE TRIGGER audit_enterprise_dados_empresa
  AFTER INSERT OR UPDATE OR DELETE ON public.dados_empresa
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_changes();
