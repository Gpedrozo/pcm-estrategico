-- Migration: Correção do login web no Portal do Mecânico
-- 
-- Problema: A RPC validar_credenciais_mecanico_servidor foi projetada para
-- o app Flutter (que sempre tem dispositivo_id), mas o portal web não
-- possui dispositivo vinculado.
--
-- Correções:
-- 1. Validar senha_acesso NULL como backward compatibility
-- 2. Pular verificação de dispositivo quando p_dispositivo_id é NULL
-- 3. Pular rate limiting quando não há dispositivo (web)
-- 4. Pular verificação de device bloqueado quando sem dispositivo

BEGIN;

CREATE OR REPLACE FUNCTION public.validar_credenciais_mecanico_servidor(
  p_empresa_id UUID,
  p_dispositivo_id UUID DEFAULT NULL,  -- NULL para login web
  p_codigo_acesso TEXT,
  p_senha_acesso TEXT,
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
  v_bloqueado_ate TIMESTAMPTZ;
  v_resultado TEXT;
  v_bloqueado BOOLEAN := false;
  v_tentativas_restantes INT;
  v_eh_login_web BOOLEAN;
BEGIN
  v_eh_login_web := p_dispositivo_id IS NULL;

  -- 1. Check if device is blocked (apenas para dispositivos mobile)
  IF NOT v_eh_login_web THEN
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
  END IF;

  -- 2. Check rate limiting state (apenas para dispositivos mobile)
  IF NOT v_eh_login_web THEN
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
  END IF;

  -- 3. Find mechanic by código_acesso
  SELECT * INTO v_mecanico
  FROM mecanicos
  WHERE empresa_id = p_empresa_id
    AND codigo_acesso = p_codigo_acesso;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'MECANICO_NAO_ENCONTRADO',
      'motivo', 'Código de acesso não encontrado'
    );
  END IF;

  -- 4. Check if mechanic is active
  IF NOT v_mecanico.ativo THEN
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'MECANICO_INATIVO',
      'motivo', 'Mecânico desativado. Contate o administrador.'
    );
  END IF;

  -- 5. Validate password (backward compatible: NULL = permite acesso)
  IF v_mecanico.senha_acesso IS NOT NULL AND v_mecanico.senha_acesso != p_senha_acesso THEN
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'SENHA_INCORRETA',
      'motivo', 'Senha inválida para este código'
    );
  END IF;

  -- 6. SUCCESS! Return mechanic data
  RETURN jsonb_build_object(
    'ok', true,
    'resultado', 'SUCESSO',
    'mecanico_id', v_mecanico.id,
    'mecanico_nome', v_mecanico.nome,
    'especialidade', v_mecanico.especialidade,
    'email', v_mecanico.email,
    'tentativas', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO authenticated, anon;

COMMIT;