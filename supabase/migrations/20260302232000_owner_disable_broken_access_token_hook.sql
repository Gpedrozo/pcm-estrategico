BEGIN;

DO $$
DECLARE
  v_has_instances boolean;
BEGIN
  SELECT to_regclass('auth.instances') IS NOT NULL INTO v_has_instances;

  IF NOT v_has_instances THEN
    RAISE NOTICE 'Tabela auth.instances não encontrada; nenhum ajuste aplicado.';
    RETURN;
  END IF;

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

  RAISE NOTICE 'Configuração de hook de access token neutralizada em auth.instances.';
END;
$$;

COMMIT;
