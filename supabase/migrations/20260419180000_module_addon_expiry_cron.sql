-- E12: Cron job to auto-disable expired module add-ons
-- Runs daily at 04:00 UTC, scanning configuracoes_sistema for module expiry dates
-- Expired modules get flipped to false in owner.modules

CREATE OR REPLACE FUNCTION public.cron_expire_module_addons()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  expiry_map JSONB;
  modules_map JSONB;
  k TEXT;
  expires_at TEXT;
  changed BOOLEAN;
BEGIN
  FOR r IN
    SELECT cs.empresa_id, cs.valor AS expiry_valor
    FROM configuracoes_sistema cs
    WHERE cs.chave = 'owner.module_expiry'
      AND cs.valor IS NOT NULL
      AND cs.valor != '{}'::jsonb
  LOOP
    expiry_map := r.expiry_valor;
    changed := FALSE;

    -- Load current modules
    SELECT valor INTO modules_map
    FROM configuracoes_sistema
    WHERE empresa_id = r.empresa_id
      AND chave = 'owner.modules';

    IF modules_map IS NULL THEN
      CONTINUE;
    END IF;

    -- Check each module expiry
    FOR k, expires_at IN SELECT * FROM jsonb_each_text(expiry_map)
    LOOP
      IF expires_at IS NOT NULL
         AND expires_at::timestamptz < NOW()
         AND (modules_map ->> k)::boolean IS TRUE
      THEN
        modules_map := jsonb_set(modules_map, ARRAY[k], 'false'::jsonb);
        -- Remove from expiry map after disabling
        expiry_map := expiry_map - k;
        changed := TRUE;
      END IF;
    END LOOP;

    IF changed THEN
      UPDATE configuracoes_sistema
      SET valor = modules_map, updated_at = NOW()
      WHERE empresa_id = r.empresa_id AND chave = 'owner.modules';

      UPDATE configuracoes_sistema
      SET valor = expiry_map, updated_at = NOW()
      WHERE empresa_id = r.empresa_id AND chave = 'owner.module_expiry';
    END IF;
  END LOOP;
END;
$$;

-- Schedule: daily at 04:00 UTC
SELECT cron.schedule(
  'expire-module-addons',
  '0 4 * * *',
  $$SELECT public.cron_expire_module_addons()$$
);
