-- Migration: Correção completa do Portal do Mecânico + Cadastro
-- 
-- Problemas corrigidos:
-- 1. RPC validar_credenciais_mecanico_servidor: login web sem dispositivo_id
-- 2. Senha NULL não era aceita (backward compatibility)
-- 3. ultimo_login_portal nunca era atualizado
-- 4. Constraint UNIQUE para codigo_acesso (evitar duplicatas)
--
-- Correções:
-- 1. RPC: pular verificação de dispositivo quando NULL (login web)
-- 2. RPC: validar senha_acesso NULL como backward compatibility
-- 3. RPC registrar_login_mecanico: atualizar ultimo_login_portal
-- 4. Adicionar UNIQUE(empresa_id, codigo_acesso) na tabela mecanicos

BEGIN;

-- ============================================================
-- CORREÇÃO 1: UNIQUE constraint para codigo_acesso
-- ============================================================

-- Remove duplicatas antes de criar a constraint (mantém o registro mais recente)
DELETE FROM public.mecanicos m1 USING (
  SELECT empresa_id, codigo_acesso, MAX(created_at) as max_created
  FROM public.mecanicos
  WHERE codigo_acesso IS NOT NULL
  GROUP BY empresa_id, codigo_acesso
  HAVING COUNT(*) > 1
) m2
WHERE m1.empresa_id = m2.empresa_id
  AND m1.codigo_acesso = m2.codigo_acesso
  AND m1.created_at < m2.max_created;

-- Adiciona UNIQUE constraint
DROP INDEX IF EXISTS idx_mecanicos_empresa_codigo_acesso;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mecanicos_empresa_codigo_acesso_unique 
  ON public.mecanicos (empresa_id, codigo_acesso) 
  WHERE codigo_acesso IS NOT NULL;

-- ============================================================
-- CORREÇÃO 2: Função registrar_login_mecanico atualizada
-- ============================================================

CREATE OR REPLACE FUNCTION public.registrar_login_mecanico(
  p_empresa_id UUID,
  p_dispositivo_id UUID DEFAULT NULL,
  p_mecanico_id UUID,
  p_device_token UUID DEFAULT NULL,
  p_codigo_acesso TEXT DEFAULT NULL,
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
  v_session_id UUID;
  v_empresa_slug TEXT;
BEGIN
  -- Close any previous active session for this mechanic
  IF p_dispositivo_id IS NOT NULL THEN
    UPDATE log_mecanicos_login SET
      logout_em = now(),
      duracao_minutos = EXTRACT(EPOCH FROM (now() - login_em))::INT / 60
    WHERE mecanico_id = p_mecanico_id
      AND dispositivo_id = p_dispositivo_id
      AND logout_em IS NULL;
  END IF;

  -- Create new login session
  INSERT INTO log_mecanicos_login (
    empresa_id, dispositivo_id, mecanico_id, device_token, codigo_acesso,
    ip_address, user_agent, device_name, status
  ) VALUES (
    p_empresa_id, p_dispositivo_id, p_mecanico_id, p_device_token, p_codigo_acesso,
    p_ip_address, p_user_agent, p_device_name, 'ATIVO'
  )
  RETURNING id INTO v_session_id;

  -- Update ultimo_login_portal no registro do mecânico
  UPDATE public.mecanicos
  SET ultimo_login_portal = now()
  WHERE id = p_mecanico_id;

  -- Get empresa slug for response
  SELECT slug INTO v_empresa_slug FROM public.empresas WHERE id = p_empresa_id;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'login_em', now(),
    'empresa_slug', v_empresa_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_login_mecanico TO authenticated, anon;

-- ============================================================
-- CORREÇÃO 3: RPC validar_credenciais_mecanico_servidor corrigida
-- ============================================================

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