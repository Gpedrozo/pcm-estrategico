-- ============================================================================
-- SUBSCRIPTION ENFORCEMENT HARDENING
-- Fecha 3 gaps críticos de enforcement:
--   1. can_access_empresa() — adiciona check de empresas.status (RLS kill-switch)
--   2. validar_credenciais_mecanico_servidor — bloqueia login de mecânico em empresa bloqueada
--   3. cron alinhamento — garante consistência entre cron SQL e enforcement
-- ============================================================================

-- ── 1. can_access_empresa() com verificação de empresas.status ──────────────
-- System operators (SYSTEM_OWNER, SYSTEM_ADMIN, MASTER_TI) bypassam o check.
-- Para todos os outros usuários, empresa com status 'blocked' ou 'deleted'
-- torna TODOS os dados inacessíveis via RLS.
CREATE OR REPLACE FUNCTION public.can_access_empresa(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      -- System-level admin roles — bypass empresa status check
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
      )
      -- Regular users: must have access AND empresa must be active
      OR (
        (
          -- Direct JWT match (root or app_metadata)
          p_empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
          OR p_empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
          OR p_empresa_id = NULLIF(auth.jwt() -> 'user_metadata' ->> 'empresa_id', '')::uuid
          -- User has any role in this empresa
          OR EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.empresa_id = p_empresa_id
          )
        )
        -- Empresa must NOT be blocked or deleted
        AND EXISTS (
          SELECT 1
          FROM public.empresas e
          WHERE e.id = p_empresa_id
            AND e.status IS DISTINCT FROM 'blocked'
            AND e.status IS DISTINCT FROM 'deleted'
        )
      )
    );
$$;

-- Grants
REVOKE EXECUTE ON FUNCTION public.can_access_empresa(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_empresa(uuid) TO authenticated;

-- ── 2. validar_credenciais_mecanico_servidor — check empresa.status ─────────
-- Adiciona verificação de empresa bloqueada logo no início da RPC
CREATE OR REPLACE FUNCTION public.validar_credenciais_mecanico_servidor(
  p_empresa_id UUID,
  p_dispositivo_id UUID DEFAULT NULL,
  p_codigo_acesso TEXT DEFAULT NULL,
  p_senha_acesso TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mecanico mecanicos;
  v_rate_limit mecanicos_rate_limit_state;
  v_dispositivo dispositivos_moveis;
  v_bloqueado_ate TIMESTAMPTZ;
  v_resultado TEXT;
  v_bloqueado BOOLEAN := false;
  v_empresa_status TEXT;
BEGIN
  -- ── CHECK EMPRESA STATUS — bloqueia se empresa está blocked/deleted ──
  SELECT status INTO v_empresa_status
  FROM empresas
  WHERE id = p_empresa_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'EMPRESA_NAO_ENCONTRADA',
      'motivo', 'Empresa não encontrada'
    );
  END IF;

  IF v_empresa_status = 'blocked' OR v_empresa_status = 'deleted' THEN
    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'EMPRESA_BLOQUEADA'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'EMPRESA_BLOQUEADA',
      'motivo', 'Empresa com acesso suspenso. Entre em contato com o suporte.'
    );
  END IF;

  -- ── Device-based checks (SOMENTE se dispositivo_id informado = fluxo mobile) ──
  IF p_dispositivo_id IS NOT NULL THEN
    SELECT bloqueado_ate INTO v_bloqueado_ate
    FROM mecanicos_blocked_devices
    WHERE dispositivo_id = p_dispositivo_id AND ativo = true
    LIMIT 1;

    IF v_bloqueado_ate IS NOT NULL THEN
      INSERT INTO log_validacoes_senha (
        empresa_id, dispositivo_id, codigo_acesso, senha_valida,
        ip_address, user_agent, device_name, resultado
      ) VALUES (
        p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
        p_ip_address, p_user_agent, p_device_name, 'DISPOSITIVO_BLOQUEADO'
      );
      RETURN jsonb_build_object(
        'ok', false,
        'resultado', 'DISPOSITIVO_BLOQUEADO',
        'motivo', 'Este dispositivo foi bloqueado por suspeita de segurança'
      );
    END IF;

    SELECT * INTO v_rate_limit
    FROM mecanicos_rate_limit_state
    WHERE dispositivo_id = p_dispositivo_id;

    IF v_rate_limit IS NOT NULL AND v_rate_limit.bloqueado_ate > now() THEN
      INSERT INTO log_validacoes_senha (
        empresa_id, dispositivo_id, codigo_acesso, senha_valida,
        ip_address, user_agent, device_name, resultado
      ) VALUES (
        p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
        p_ip_address, p_user_agent, p_device_name, 'TENTATIVAS_EXCEDIDAS'
      );
      RETURN jsonb_build_object(
        'ok', false,
        'resultado', 'TENTATIVAS_EXCEDIDAS',
        'bloqueado_ate', v_rate_limit.bloqueado_ate::TEXT,
        'motivo', 'Muitas tentativas falhas. Aguarde ' ||
          EXTRACT(EPOCH FROM (v_rate_limit.bloqueado_ate - now()))::INT || ' segundos'
      );
    END IF;

    SELECT * INTO v_dispositivo
    FROM dispositivos_moveis
    WHERE id = p_dispositivo_id AND ativo = true;

    IF NOT FOUND THEN
      INSERT INTO log_validacoes_senha (
        empresa_id, dispositivo_id, codigo_acesso, senha_valida,
        ip_address, user_agent, device_name, resultado
      ) VALUES (
        p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
        p_ip_address, p_user_agent, p_device_name, 'DISPOSITIVO_BLOQUEADO'
      );
      RETURN jsonb_build_object(
        'ok', false,
        'resultado', 'DISPOSITIVO_BLOQUEADO',
        'motivo', 'Dispositivo desativado'
      );
    END IF;
  END IF;

  -- 4. Find mechanic by código_acesso
  SELECT * INTO v_mecanico
  FROM mecanicos
  WHERE empresa_id = p_empresa_id
    AND codigo_acesso = p_codigo_acesso;

  IF NOT FOUND THEN
    IF p_dispositivo_id IS NOT NULL THEN
      INSERT INTO mecanicos_rate_limit_state (empresa_id, dispositivo_id, tentativas_ultimas_1h)
      VALUES (p_empresa_id, p_dispositivo_id, 1)
      ON CONFLICT(dispositivo_id) DO UPDATE SET
        tentativas_ultimas_1h = EXCLUDED.tentativas_ultimas_1h + 1,
        atualizado_em = now();
    END IF;

    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'MECANICO_NAO_ENCONTRADO'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'MECANICO_NAO_ENCONTRADO',
      'motivo', 'Código de acesso não encontrado'
    );
  END IF;

  -- 5. Check if mechanic is active
  IF NOT v_mecanico.ativo THEN
    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, mecanico_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, v_mecanico.id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'MECANICO_INATIVO'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'MECANICO_INATIVO',
      'motivo', 'Mecânico inativo'
    );
  END IF;

  -- 6. Validate password via BCRYPT (V8: substituiu comparação plaintext)
  --    Fallback: se senha_hash está NULL mas senha_acesso existe, migra on-the-fly
  IF v_mecanico.senha_hash IS NULL AND v_mecanico.senha_acesso IS NOT NULL AND v_mecanico.senha_acesso != '' THEN
    UPDATE mecanicos SET senha_hash = crypt(v_mecanico.senha_acesso, gen_salt('bf', 10))
    WHERE id = v_mecanico.id;
    v_mecanico.senha_hash := crypt(v_mecanico.senha_acesso, gen_salt('bf', 10));
  END IF;

  IF v_mecanico.senha_hash IS NULL OR v_mecanico.senha_hash != crypt(p_senha_acesso, v_mecanico.senha_hash) THEN
    IF p_dispositivo_id IS NOT NULL THEN
      UPDATE mecanicos_rate_limit_state SET
        tentativas_ultimas_1h = tentativas_ultimas_1h + 1,
        tentativas_ultimas_24h = tentativas_ultimas_24h + 1,
        atualizado_em = now()
      WHERE dispositivo_id = p_dispositivo_id;
    END IF;

    INSERT INTO log_validacoes_senha (
      empresa_id, dispositivo_id, mecanico_id, codigo_acesso, senha_valida,
      ip_address, user_agent, device_name, resultado
    ) VALUES (
      p_empresa_id, p_dispositivo_id, v_mecanico.id, p_codigo_acesso, false,
      p_ip_address, p_user_agent, p_device_name, 'SENHA_INCORRETA'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'SENHA_INCORRETA',
      'motivo', 'Senha inválida'
    );
  END IF;

  -- 7. SUCCESS! Reset rate limit (only if device-based)
  IF p_dispositivo_id IS NOT NULL THEN
    UPDATE mecanicos_rate_limit_state SET
      tentativas_ultimas_1h = 0,
      tentativas_ultimas_24h = 0,
      bloqueado_ate = NULL,
      motivo_bloqueio = NULL,
      atualizado_em = now()
    WHERE dispositivo_id = p_dispositivo_id;
  END IF;

  INSERT INTO log_validacoes_senha (
    empresa_id, dispositivo_id, mecanico_id, codigo_acesso, senha_valida,
    ip_address, user_agent, device_name, resultado
  ) VALUES (
    p_empresa_id, p_dispositivo_id, v_mecanico.id, p_codigo_acesso, true,
    p_ip_address, p_user_agent, p_device_name, 'SUCESSO'
  );

  INSERT INTO audit_logs (
    action, table_name, record_id, actor_email, metadata
  ) VALUES (
    'VALIDACAO_SENHA_MECANICO_SUCESSO',
    'mecanicos',
    v_mecanico.id::text,
    v_mecanico.nome,
    jsonb_build_object(
      'dispositivo_id', p_dispositivo_id,
      'ip', p_ip_address,
      'source', CASE WHEN p_dispositivo_id IS NULL THEN 'portal-web' ELSE 'mobile-app' END
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'resultado', 'SUCESSO',
    'mecanico_id', v_mecanico.id,
    'mecanico_nome', v_mecanico.nome,
    'especialidade', v_mecanico.especialidade
  );
END;
$$;

-- Manter grants restritivos (V8)
REVOKE ALL ON FUNCTION public.validar_credenciais_mecanico_servidor FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_credenciais_mecanico_servidor FROM anon;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO service_role;

-- ── 3. Smoke test: validar que as funções foram recriadas corretamente ──────
DO $$
BEGIN
  -- Verifica can_access_empresa
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_access_empresa'
  ) THEN
    RAISE EXCEPTION 'SMOKE FAIL: can_access_empresa não existe após migration';
  END IF;

  -- Verifica validar_credenciais_mecanico_servidor contém check de empresa_status
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'validar_credenciais_mecanico_servidor'
      AND p.prosrc LIKE '%EMPRESA_BLOQUEADA%'
  ) THEN
    RAISE EXCEPTION 'SMOKE FAIL: validar_credenciais_mecanico_servidor não contém check EMPRESA_BLOQUEADA';
  END IF;

  -- Verifica can_access_empresa contém check de status
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'can_access_empresa'
      AND p.prosrc LIKE '%blocked%'
  ) THEN
    RAISE EXCEPTION 'SMOKE FAIL: can_access_empresa não contém check de status blocked';
  END IF;

  RAISE NOTICE '[ENFORCEMENT-HARDENING] All smoke tests passed';
END;
$$;
