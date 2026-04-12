-- =====================================================================
-- MIGRATION V9: Limpeza senha_acesso → bcrypt-only
-- Pré-requisitos: V3 (senha_hash criada), V8 (bcrypt na RPC principal),
--                 plano_acao_zero_falhas (senha_acesso nullificada)
-- =====================================================================

-- ─── 1. Safety gate: aborta se algum mecânico ainda depende de plaintext ───
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.mecanicos
  WHERE senha_hash IS NULL
    AND senha_acesso IS NOT NULL
    AND senha_acesso != '';

  IF v_count > 0 THEN
    RAISE EXCEPTION '[V9-ABORT] % mecânicos ainda possuem senha_acesso sem senha_hash. Migre primeiro.', v_count;
  END IF;

  RAISE NOTICE '[V9-001] Safety gate OK — nenhum mecânico com plaintext pendente';
END $$;

-- ─── 2. Reescrever RPC principal sem fallback plaintext ───────────────────
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
BEGIN
  -- ── Device-based checks ──
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

  -- Find mechanic by código_acesso
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

  -- Check if mechanic is active
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

  -- Validate password via BCRYPT ONLY (V9: removido fallback plaintext)
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

  -- SUCCESS! Reset rate limit
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

-- Permissões da RPC
REVOKE ALL ON FUNCTION public.validar_credenciais_mecanico_servidor FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_credenciais_mecanico_servidor FROM anon;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO service_role;


-- ─── 3. Dropar RPCs legadas que comparam senha_acesso em plaintext ────────
DROP FUNCTION IF EXISTS public.validar_senha_mecanico(UUID, TEXT);
DROP FUNCTION IF EXISTS public.login_mecanico(UUID, TEXT, TEXT, UUID);

DO $$ BEGIN
  RAISE NOTICE '[V9-002] RPCs legadas plaintext dropadas (validar_senha_mecanico, login_mecanico)';
END $$;


-- ─── 4. Dropar coluna plaintext ──────────────────────────────────────────
ALTER TABLE public.mecanicos DROP COLUMN IF EXISTS senha_acesso;

DO $$ BEGIN
  RAISE NOTICE '[V9-003] Coluna senha_acesso removida da tabela mecanicos';
END $$;


-- ─── 5. Resumo ───────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE ' V9 COMPLETA: Autenticação de mecânicos agora é 100%% bcrypt  ';
  RAISE NOTICE ' - Fallback plaintext removido da RPC principal               ';
  RAISE NOTICE ' - RPCs legadas dropadas                                      ';
  RAISE NOTICE ' - Coluna senha_acesso eliminada                              ';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;
