-- Enterprise white-label multi-tenant hardening, plans/limits and billing-ready structures.

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS dominio_customizado text,
  ADD COLUMN IF NOT EXISTS plano_id uuid,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS empresas_slug_key ON public.empresas (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS empresas_dominio_customizado_key ON public.empresas (dominio_customizado) WHERE dominio_customizado IS NOT NULL;

UPDATE public.empresas
SET slug = COALESCE(slug, regexp_replace(lower(nome), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  preco_mensal numeric(12,2) NOT NULL DEFAULT 0,
  limite_usuarios integer NOT NULL DEFAULT 5,
  limite_projetos integer NOT NULL DEFAULT 50,
  limite_armazenamento_mb integer NOT NULL DEFAULT 1024,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.planos (nome, preco_mensal, limite_usuarios, limite_projetos, limite_armazenamento_mb, features)
VALUES (
  'starter',
  0,
  5,
  50,
  1024,
  '{"dashboard":true,"ordens_servico":true,"preventiva":false,"fmea":false,"rca":false,"documentos":false}'::jsonb
)
ON CONFLICT (nome) DO NOTHING;

UPDATE public.empresas e
SET plano_id = p.id
FROM public.planos p
WHERE e.plano_id IS NULL
  AND p.nome = 'starter';

ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_plano_id_fkey
  FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.empresa_limites (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuarios_atuais integer NOT NULL DEFAULT 0,
  projetos_atuais integer NOT NULL DEFAULT 0,
  armazenamento_usado_mb integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.empresa_limites (empresa_id)
SELECT e.id
FROM public.empresas e
ON CONFLICT (empresa_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.empresa_branding (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  logo_url text,
  cor_primaria text NOT NULL DEFAULT '#1e3a5f',
  cor_secundaria text NOT NULL DEFAULT '#38bdf8',
  nome_sistema text NOT NULL DEFAULT 'PCM Estratégico',
  favicon_url text,
  css_customizado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.empresa_branding (empresa_id)
SELECT e.id
FROM public.empresas e
ON CONFLICT (empresa_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.empresa_assinaturas (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'ativo',
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.empresa_assinaturas (empresa_id, status, periodo_inicio, periodo_fim)
SELECT e.id, 'ativo', now(), now() + interval '10 years'
FROM public.empresas e
ON CONFLICT (empresa_id) DO NOTHING;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS antes jsonb,
  ADD COLUMN IF NOT EXISTS depois jsonb,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS "timestamp" timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.verificar_empresa_ativa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas e
    LEFT JOIN public.empresa_assinaturas ea ON ea.empresa_id = e.id
    WHERE e.id = _empresa_id
      AND e.ativo = true
      AND (
        ea.empresa_id IS NULL
        OR (
          ea.status = 'ativo'
          AND (ea.periodo_fim IS NULL OR ea.periodo_fim >= now())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.empresa_tem_feature(_empresa_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((p.features ->> _feature_key)::boolean, false)
  FROM public.empresas e
  JOIN public.planos p ON p.id = e.plano_id
  WHERE e.id = _empresa_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
    OR EXISTS (
      SELECT 1
      FROM public.empresa_usuarios eu
      WHERE eu.user_id = auth.uid()
        AND eu.empresa_id = _empresa_id
    )
  ) AND public.verificar_empresa_ativa(_empresa_id);
$$;

CREATE OR REPLACE FUNCTION public.assert_limite_usuarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limite integer;
  v_atuais integer;
BEGIN
  SELECT p.limite_usuarios
  INTO v_limite
  FROM public.empresas e
  JOIN public.planos p ON p.id = e.plano_id
  WHERE e.id = NEW.empresa_id;

  SELECT COUNT(*) INTO v_atuais
  FROM public.empresa_usuarios eu
  WHERE eu.empresa_id = NEW.empresa_id;

  IF v_limite IS NOT NULL AND v_atuais >= v_limite THEN
    RAISE EXCEPTION 'Limite de usuarios do plano foi atingido';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_limite_usuarios ON public.empresa_usuarios;
CREATE TRIGGER trg_assert_limite_usuarios
  BEFORE INSERT ON public.empresa_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_limite_usuarios();

CREATE OR REPLACE FUNCTION public.refresh_empresa_limites(_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuarios integer;
  v_projetos integer;
BEGIN
  SELECT COUNT(*) INTO v_usuarios
  FROM public.empresa_usuarios
  WHERE empresa_id = _empresa_id;

  SELECT COUNT(*) INTO v_projetos
  FROM public.ordens_servico
  WHERE empresa_id = _empresa_id;

  INSERT INTO public.empresa_limites (empresa_id, usuarios_atuais, projetos_atuais, updated_at)
  VALUES (_empresa_id, v_usuarios, v_projetos, now())
  ON CONFLICT (empresa_id) DO UPDATE SET
    usuarios_atuais = EXCLUDED.usuarios_atuais,
    projetos_atuais = EXCLUDED.projetos_atuais,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_empresa_limites_from_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_empresa_limites(COALESCE(NEW.empresa_id, OLD.empresa_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_empresa_limites_usuarios ON public.empresa_usuarios;
CREATE TRIGGER trg_refresh_empresa_limites_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.empresa_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_empresa_limites_from_trigger();

DROP TRIGGER IF EXISTS trg_refresh_empresa_limites_os ON public.ordens_servico;
CREATE TRIGGER trg_refresh_empresa_limites_os
  AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_empresa_limites_from_trigger();

CREATE OR REPLACE FUNCTION public.assert_empresa_role_change_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_empresa_id uuid := COALESCE(NEW.empresa_id, OLD.empresa_id);
  v_is_master boolean := public.has_global_role(v_actor, 'MASTER_TI'::public.global_role);
  v_is_owner boolean := public.has_empresa_role(v_actor, v_empresa_id, 'OWNER'::public.empresa_role);
BEGIN
  IF v_is_master OR v_is_owner THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Somente OWNER ou MASTER_TI podem alterar papeis da empresa';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_empresa_plano_change_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plano_id IS DISTINCT FROM OLD.plano_id
     AND NOT public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role) THEN
    RAISE EXCEPTION 'Somente MASTER_TI pode alterar plano da empresa';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_empresa_plano_change_allowed ON public.empresas;
CREATE TRIGGER trg_assert_empresa_plano_change_allowed
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_empresa_plano_change_allowed();

CREATE OR REPLACE FUNCTION public.audit_enterprise_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := to_jsonb(OLD);
  v_empresa_id uuid := COALESCE(
    NULLIF(v_new ->> 'empresa_id', '')::uuid,
    NULLIF(v_old ->> 'empresa_id', '')::uuid
  );
  v_registro_id uuid := COALESCE(
    NULLIF(v_new ->> 'id', '')::uuid,
    NULLIF(v_old ->> 'id', '')::uuid,
    NULLIF(v_new ->> 'user_id', '')::uuid,
    NULLIF(v_old ->> 'user_id', '')::uuid
  );
BEGIN
  INSERT INTO public.audit_logs (
    empresa_id,
    user_id_executor,
    acao,
    tabela,
    registro_id,
    antes,
    depois,
    ip,
    user_agent,
    "timestamp"
  )
  VALUES (
    v_empresa_id,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_registro_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN v_old ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN v_new ELSE NULL END,
    current_setting('request.headers.x-forwarded-for', true),
    current_setting('request.headers.user-agent', true),
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_empresa_usuarios ON public.empresa_usuarios;
CREATE TRIGGER trg_audit_empresa_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.empresa_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_enterprise_changes();

DROP TRIGGER IF EXISTS trg_audit_global_roles ON public.global_roles;
CREATE TRIGGER trg_audit_global_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.global_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_enterprise_changes();

DROP TRIGGER IF EXISTS trg_audit_empresas ON public.empresas;
CREATE TRIGGER trg_audit_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_enterprise_changes();

DROP TRIGGER IF EXISTS trg_audit_planos ON public.planos;
CREATE TRIGGER trg_audit_planos
  AFTER INSERT OR UPDATE OR DELETE ON public.planos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_enterprise_changes();

DO $$
DECLARE
  v_default_empresa uuid;
  rec record;
BEGIN
  SELECT e.id INTO v_default_empresa
  FROM public.empresas e
  ORDER BY e.created_at ASC
  LIMIT 1;

  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname NOT IN (
        'empresas',
        'empresa_usuarios',
        'global_roles',
        'planos',
        'empresa_limites',
        'empresa_branding',
        'empresa_assinaturas',
        'audit_logs',
        'profiles',
        'user_roles',
        'auditoria',
        'schema_migrations'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id uuid', rec.table_name);
    EXECUTE format('UPDATE public.%I SET empresa_id = $1 WHERE empresa_id IS NULL', rec.table_name) USING v_default_empresa;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL', rec.table_name);
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE',
        rec.table_name,
        rec.table_name || '_empresa_id_fkey'
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> 'schema_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);
  END LOOP;
END $$;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_limites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and master can manage company users" ON public.empresa_usuarios;
CREATE POLICY "Owner and master can manage company users"
ON public.empresa_usuarios
FOR ALL
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_usuarios.empresa_id, 'OWNER'::public.empresa_role)
)
WITH CHECK (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_usuarios.empresa_id, 'OWNER'::public.empresa_role)
);

DROP POLICY IF EXISTS "Tenant can read branding" ON public.empresa_branding;
CREATE POLICY "Tenant can read branding"
ON public.empresa_branding
FOR SELECT
USING (public.can_access_empresa(empresa_branding.empresa_id));

DROP POLICY IF EXISTS "Owner and master manage branding" ON public.empresa_branding;
CREATE POLICY "Owner and master manage branding"
ON public.empresa_branding
FOR ALL
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_branding.empresa_id, 'OWNER'::public.empresa_role)
)
WITH CHECK (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_branding.empresa_id, 'OWNER'::public.empresa_role)
);

DROP POLICY IF EXISTS "Master manages plans" ON public.planos;
CREATE POLICY "Master manages plans"
ON public.planos
FOR ALL
USING (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Tenant can read limits" ON public.empresa_limites;
CREATE POLICY "Tenant can read limits"
ON public.empresa_limites
FOR SELECT
USING (public.can_access_empresa(empresa_limites.empresa_id));

DROP POLICY IF EXISTS "System updates limits" ON public.empresa_limites;
CREATE POLICY "System updates limits"
ON public.empresa_limites
FOR ALL
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_limites.empresa_id, 'OWNER'::public.empresa_role)
)
WITH CHECK (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_limites.empresa_id, 'OWNER'::public.empresa_role)
);

DROP POLICY IF EXISTS "Tenant can read subscriptions" ON public.empresa_assinaturas;
CREATE POLICY "Tenant can read subscriptions"
ON public.empresa_assinaturas
FOR SELECT
USING (public.can_access_empresa(empresa_assinaturas.empresa_id));

DROP POLICY IF EXISTS "Master manages subscriptions" ON public.empresa_assinaturas;
CREATE POLICY "Master manages subscriptions"
ON public.empresa_assinaturas
FOR ALL
USING (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Audit visible to owner and master" ON public.audit_logs;
CREATE POLICY "Audit visible to owner and master"
ON public.audit_logs
FOR SELECT
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR (empresa_id IS NOT NULL AND public.has_empresa_role(auth.uid(), empresa_id, 'OWNER'::public.empresa_role))
);

DROP POLICY IF EXISTS "Master manages companies" ON public.empresas;
CREATE POLICY "Master manages companies"
ON public.empresas
FOR ALL
USING (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Tenant reads own company active" ON public.empresas;
CREATE POLICY "Tenant reads own company active"
ON public.empresas
FOR SELECT
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.user_id = auth.uid()
      AND eu.empresa_id = empresas.id
  )
);

CREATE OR REPLACE VIEW public.users_full AS
SELECT
  p.id,
  au.email,
  eu.empresa_id,
  eu.role AS role_empresa,
  gr.role AS role_global,
  p.nome,
  p.created_at,
  p.updated_at,
  CASE
    WHEN gr.role = 'MASTER_TI'::public.global_role THEN 'MASTER_TI'::public.app_role
    WHEN eu.role IN ('OWNER'::public.empresa_role, 'ADMIN'::public.empresa_role) THEN 'ADMIN'::public.app_role
    ELSE 'USUARIO'::public.app_role
  END AS role
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN public.empresa_usuarios eu ON eu.user_id = p.id
LEFT JOIN public.global_roles gr ON gr.user_id = p.id
LEFT JOIN public.empresas e ON e.id = eu.empresa_id
WHERE eu.empresa_id IS NULL OR public.verificar_empresa_ativa(eu.empresa_id);

GRANT EXECUTE ON FUNCTION public.verificar_empresa_ativa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.empresa_tem_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_empresa_limites(uuid) TO authenticated;
