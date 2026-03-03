-- Post-reset assertions and smoke validation
-- This migration must fail if critical setup is not ready.

DO $$
DECLARE
  v_empresa_id uuid;
  v_owner_count integer;
  v_master_count integer;
  v_allowlist_count integer;
  v_smoke_id uuid;
  v_remaining integer;
BEGIN
  SELECT COUNT(*)
    INTO v_owner_count
  FROM public.user_roles
  WHERE role = 'SYSTEM_OWNER'::public.app_role;

  IF v_owner_count < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL: Nenhum SYSTEM_OWNER encontrado em user_roles';
  END IF;

  SELECT COUNT(*)
    INTO v_master_count
  FROM public.user_roles
  WHERE role = 'MASTER_TI'::public.app_role;

  IF v_master_count < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL: Nenhum MASTER_TI encontrado em user_roles';
  END IF;

  IF to_regclass('public.system_owner_allowlist') IS NOT NULL THEN
    SELECT COUNT(*)
      INTO v_allowlist_count
    FROM public.system_owner_allowlist
    WHERE lower(email) = 'pedrozo@gppis.com.br';

    IF v_allowlist_count < 1 THEN
      RAISE EXCEPTION 'ASSERT FAIL: pedrozo@gppis.com.br não está na system_owner_allowlist';
    END IF;
  END IF;

  SELECT id
    INTO v_empresa_id
  FROM public.empresas
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL: Nenhuma empresa cadastrada após reset';
  END IF;

  INSERT INTO public.configuracoes_sistema (empresa_id, chave, valor)
  VALUES (v_empresa_id, 'smoke.test.integracao', jsonb_build_object('ok', true, 'ts', now()))
  ON CONFLICT (empresa_id, chave)
  DO UPDATE SET valor = EXCLUDED.valor, updated_at = now()
  RETURNING id INTO v_smoke_id;

  IF v_smoke_id IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL: Falha ao escrever registro de smoke test';
  END IF;

  DELETE FROM public.configuracoes_sistema
  WHERE empresa_id = v_empresa_id
    AND chave = 'smoke.test.integracao';

  SELECT COUNT(*)
    INTO v_remaining
  FROM public.configuracoes_sistema
  WHERE empresa_id = v_empresa_id
    AND chave = 'smoke.test.integracao';

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL: Limpeza do smoke test falhou';
  END IF;
END;
$$;
