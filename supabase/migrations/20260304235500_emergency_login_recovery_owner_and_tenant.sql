BEGIN;

CREATE TABLE IF NOT EXISTS public.empresa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  dominio_custom text UNIQUE,
  logo_url text,
  cor_primaria text NOT NULL DEFAULT '#2563eb',
  cor_secundaria text NOT NULL DEFAULT '#0f172a',
  nome_exibicao text,
  favicon_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_config_empresa_id ON public.empresa_config (empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_config_dominio_custom ON public.empresa_config (dominio_custom) WHERE dominio_custom IS NOT NULL;

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_empresa_id uuid;
  v_user_id uuid;
  v_email text;
BEGIN
  SELECT id INTO v_empresa_id
  FROM public.empresas
  WHERE slug = 'gppis'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    SELECT id INTO v_empresa_id
    FROM public.empresas
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa disponível para mapeamento de domínio.';
  END IF;

  UPDATE public.empresa_config
  SET dominio_custom = NULL,
      updated_at = now()
  WHERE dominio_custom IN ('gppis.com.br', 'www.gppis.com.br')
    AND empresa_id <> v_empresa_id;

  INSERT INTO public.empresa_config (empresa_id, dominio_custom, nome_exibicao)
  VALUES (v_empresa_id, 'gppis.com.br', 'GPPIS')
  ON CONFLICT (empresa_id) DO UPDATE
  SET dominio_custom = EXCLUDED.dominio_custom,
      nome_exibicao = COALESCE(public.empresa_config.nome_exibicao, EXCLUDED.nome_exibicao),
      updated_at = now();

  FOR v_email IN
    SELECT unnest(ARRAY['pedrozo@gppis.com.br','authtest1772676008706@gmail.com'])
  LOOP
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'Usuário % não encontrado em auth.users.', v_email;
      CONTINUE;
    END IF;

    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
        updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.profiles (id, empresa_id, nome, email)
    VALUES (v_user_id, v_empresa_id, split_part(v_email, '@', 1), lower(v_email))
    ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        email = EXCLUDED.email,
        updated_at = now();

    INSERT INTO public.user_roles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
    ON CONFLICT DO NOTHING;

    IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
      INSERT INTO public.system_owner_allowlist (email)
      VALUES (lower(v_email))
      ON CONFLICT (email) DO NOTHING;
    END IF;

    RAISE NOTICE 'SYSTEM_OWNER garantido para % (%).', v_email, v_user_id;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'empresa_config'
      AND policyname = 'empresa_config_domain_lookup_public'
  ) THEN
    CREATE POLICY empresa_config_domain_lookup_public
      ON public.empresa_config
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_self_read_or_system'
  ) THEN
    CREATE POLICY user_roles_self_read_or_system
      ON public.user_roles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

COMMIT;
