BEGIN;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN event;
END;
$$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_admin';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticator';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated';
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'Algum role não existe para grant do custom_access_token_hook';
  END;

  BEGIN
    IF to_regclass('auth.instances') IS NOT NULL THEN
      UPDATE auth.instances
      SET raw_base_config = (
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(NULLIF(raw_base_config, '')::jsonb, '{}'::jsonb),
                '{HOOK_CUSTOM_ACCESS_TOKEN_ENABLED}',
                'false'::jsonb,
                true
              ),
              '{hook_custom_access_token_enabled}',
              'false'::jsonb,
              true
            ),
            '{HOOK_CUSTOM_ACCESS_TOKEN_URI}',
            'null'::jsonb,
            true
          ),
          '{hook_custom_access_token_uri}',
          'null'::jsonb,
          true
        )::text
      );
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para atualizar auth.instances';
  END;
END;
$$;

COMMIT;
