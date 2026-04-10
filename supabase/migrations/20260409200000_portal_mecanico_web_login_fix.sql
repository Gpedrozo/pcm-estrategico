-- ============================================================
-- FIX: Portal do Mecânico (web) login sem dispositivo vinculado
--
-- Problema: validar_credenciais_mecanico_servidor e registrar_login_mecanico
-- exigem p_dispositivo_id UUID (FK de dispositivos_moveis), mas o portal web
-- não tem dispositivo vinculado.
--
-- Solução: Tornar p_dispositivo_id opcional (DEFAULT NULL) e pular validações
-- de dispositivo quando NULL (fluxo web). Não quebra fluxo mobile existente.
--
-- Também garante que tabelas auxiliares existam (podem não ter sido criadas
-- se migrations anteriores em UTF-16 falharam).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 0. GARANTIR TABELAS AUXILIARES (idempotente)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mecanicos_rate_limit_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES public.dispositivos_moveis(id) ON DELETE CASCADE,
  tentativas_ultimas_1h INT DEFAULT 0,
  tentativas_ultimas_24h INT DEFAULT 0,
  bloqueado_ate TIMESTAMPTZ,
  motivo_bloqueio TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_device_rate_limit UNIQUE(dispositivo_id)
);

CREATE TABLE IF NOT EXISTS public.mecanicos_blocked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES public.dispositivos_moveis(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  bloqueado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bloqueado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ativo BOOLEAN DEFAULT true,
  desbloqueado_em TIMESTAMPTZ,
  desbloqueado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.log_validacoes_senha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mecanico_id UUID REFERENCES public.mecanicos(id) ON DELETE SET NULL,
  dispositivo_id UUID REFERENCES public.dispositivos_moveis(id) ON DELETE CASCADE,
  codigo_acesso TEXT NOT NULL,
  senha_valida BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_name TEXT,
  resultado TEXT NOT NULL CHECK (resultado IN (
    'SUCESSO', 'SENHA_INCORRETA', 'MECANICO_NAO_ENCONTRADO',
    'MECANICO_INATIVO', 'DISPOSITIVO_BLOQUEADO', 'TENTATIVAS_EXCEDIDAS', 'ERRO_VALIDACAO'
  )),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.log_mecanicos_login (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES public.dispositivos_moveis(id) ON DELETE CASCADE,
  mecanico_id UUID NOT NULL REFERENCES public.mecanicos(id) ON DELETE CASCADE,
  device_token UUID,
  codigo_acesso TEXT NOT NULL,
  login_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_em TIMESTAMPTZ,
  duracao_minutos INT,
  ip_address INET,
  user_agent TEXT,
  device_name TEXT,
  motivo_logout TEXT,
  status VARCHAR(50) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'TIMEOUT', 'MANUAL', 'DISPOSITIVO_DESATIVADO')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_logout_after_login CHECK (logout_em IS NULL OR logout_em > login_em)
);

CREATE TABLE IF NOT EXISTS public.log_tentativas_login (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES public.dispositivos_moveis(id) ON DELETE CASCADE,
  codigo_acesso TEXT NOT NULL,
  tentativa_numero INT NOT NULL,
  sucesso BOOLEAN NOT NULL DEFAULT false,
  motivo_falha TEXT,
  ip_address INET,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_bloqueio VARCHAR(50) DEFAULT 'TENTANDO' CHECK (status_bloqueio IN ('TENTANDO', 'BLOQUEADO', 'LIBERADO'))
);

-- Tornar dispositivo_id nullable para suportar portal web
ALTER TABLE IF EXISTS public.log_mecanicos_login
  ALTER COLUMN dispositivo_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.log_mecanicos_login
  ALTER COLUMN device_token DROP NOT NULL;

ALTER TABLE IF EXISTS public.log_validacoes_senha
  ALTER COLUMN dispositivo_id DROP NOT NULL;

-- Enable RLS (idempotente)
ALTER TABLE IF EXISTS public.mecanicos_rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mecanicos_blocked_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.log_validacoes_senha ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.log_mecanicos_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.log_tentativas_login ENABLE ROW LEVEL SECURITY;

-- RLS policies (idempotentes via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'log_validacoes_insert' AND tablename = 'log_validacoes_senha') THEN
    CREATE POLICY log_validacoes_insert ON public.log_validacoes_senha FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'log_mecanicos_login_device_insert' AND tablename = 'log_mecanicos_login') THEN
    CREATE POLICY log_mecanicos_login_device_insert ON public.log_mecanicos_login FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'log_tentativas_insert' AND tablename = 'log_tentativas_login') THEN
    CREATE POLICY log_tentativas_insert ON public.log_tentativas_login FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. RECREATE validar_credenciais_mecanico_servidor
--    com p_dispositivo_id UUID DEFAULT NULL
-- ─────────────────────────────────────────────────────────────

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
BEGIN
  -- ── Device-based checks (SOMENTE se dispositivo_id informado = fluxo mobile) ──
  IF p_dispositivo_id IS NOT NULL THEN
    -- 1. Check if device is blocked
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

    -- 2. Check rate limiting state
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

    -- 3. Check if device is active
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
  -- ── Fim dos device checks ──

  -- 4. Find mechanic by código_acesso
  SELECT * INTO v_mecanico
  FROM mecanicos
  WHERE empresa_id = p_empresa_id
    AND codigo_acesso = p_codigo_acesso;

  IF NOT FOUND THEN
    -- Update rate limit counter (only if device-based)
    IF p_dispositivo_id IS NOT NULL THEN
      INSERT INTO mecanicos_rate_limit_state (empresa_id, dispositivo_id, tentativas_ultimas_1h)
      VALUES (p_empresa_id, p_dispositivo_id, 1)
      ON CONFLICT(dispositivo_id) DO UPDATE SET
        tentativas_ultimas_1h = EXCLUDED.tentativas_ultimas_1h + 1,
        atualizado_em = now();
    END IF;

    -- Log the attempt (dispositivo_id pode ser NULL para web)
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

  -- 6. Validate password
  IF v_mecanico.senha_acesso IS NULL OR v_mecanico.senha_acesso != p_senha_acesso THEN
    -- Increment failed attempts (only if device-based)
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

  -- Audit log
  INSERT INTO audit_logs (
    action, schema_name, table_name, record_id, actor_email, metadata
  ) VALUES (
    'VALIDACAO_SENHA_MECANICO_SUCESSO',
    'public',
    'mecanicos',
    v_mecanico.id,
    v_mecanico.email,
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
    'especialidade', v_mecanico.especialidade,
    'email', v_mecanico.email
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. RECREATE registrar_login_mecanico
--    com p_dispositivo_id UUID DEFAULT NULL e p_device_token UUID DEFAULT NULL
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.registrar_login_mecanico(
  p_empresa_id UUID,
  p_dispositivo_id UUID DEFAULT NULL,
  p_mecanico_id UUID DEFAULT NULL,
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
  v_dispositivo dispositivos_moveis;
BEGIN
  -- Verify device is active (somente se dispositivo_id informado = fluxo mobile)
  IF p_dispositivo_id IS NOT NULL THEN
    SELECT * INTO v_dispositivo FROM dispositivos_moveis 
    WHERE id = p_dispositivo_id AND ativo = true;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Dispositivo desativado');
    END IF;
  END IF;

  -- Check if already logged in (close previous session)
  UPDATE log_mecanicos_login SET
    logout_em = now(),
    status = 'TIMEOUT',
    duracao_minutos = EXTRACT(EPOCH FROM (now() - login_em))::INT / 60
  WHERE mecanico_id = p_mecanico_id
    AND (p_dispositivo_id IS NULL OR dispositivo_id = p_dispositivo_id)
    AND logout_em IS NULL
    AND status = 'ATIVO';

  -- Create new login session
  INSERT INTO log_mecanicos_login (
    empresa_id, dispositivo_id, mecanico_id, device_token, codigo_acesso,
    ip_address, user_agent, device_name, status
  ) VALUES (
    p_empresa_id, p_dispositivo_id, p_mecanico_id, p_device_token, p_codigo_acesso,
    p_ip_address, p_user_agent, p_device_name, 'ATIVO'
  )
  RETURNING id INTO v_session_id;

  -- Update device last access (somente se dispositivo_id informado)
  IF p_dispositivo_id IS NOT NULL THEN
    UPDATE dispositivos_moveis SET
      mecanico_ultimo_id = p_mecanico_id,
      ultimo_acesso = now()
    WHERE id = p_dispositivo_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (
    action, schema_name, table_name, record_id, actor_email, metadata
  ) VALUES (
    'MECANICO_LOGIN',
    'public',
    'log_mecanicos_login',
    v_session_id,
    (SELECT email FROM profiles WHERE id = p_mecanico_id LIMIT 1),
    jsonb_build_object(
      'mecanico_id', p_mecanico_id,
      'codigo', p_codigo_acesso,
      'source', CASE WHEN p_dispositivo_id IS NULL THEN 'portal-web' ELSE 'mobile-app' END
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'login_em', now()::TEXT
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. RECREATE registrar_logout_mecanico (se não existir)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.registrar_logout_mecanico(
  p_session_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session log_mecanicos_login;
BEGIN
  UPDATE log_mecanicos_login SET
    logout_em = now(),
    motivo_logout = COALESCE(p_motivo, 'Logout manual'),
    status = 'MANUAL',
    duracao_minutos = EXTRACT(EPOCH FROM (now() - login_em))::INT / 60
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão não encontrada');
  END IF;

  INSERT INTO audit_logs (
    action, schema_name, table_name, record_id, actor_email, metadata
  ) VALUES (
    'MECANICO_LOGOUT', 'public', 'log_mecanicos_login', p_session_id,
    (SELECT email FROM profiles WHERE id = v_session.mecanico_id LIMIT 1),
    jsonb_build_object('mecanico_id', v_session.mecanico_id, 'duracao_minutos', v_session.duracao_minutos, 'motivo', v_session.motivo_logout)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'logout_em', now()::TEXT,
    'duracao_minutos', v_session.duracao_minutos
  );
END;
$$;

-- Manter grants existentes
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.registrar_login_mecanico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.registrar_logout_mecanico TO authenticated, anon;

-- Grants para tabelas (SECURITY DEFINER acessa direto, mas para views/RLS)
GRANT SELECT, INSERT ON public.log_validacoes_senha TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.log_mecanicos_login TO authenticated, anon;
GRANT SELECT, INSERT ON public.log_tentativas_login TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.mecanicos_rate_limit_state TO authenticated, anon;
GRANT SELECT ON public.mecanicos_blocked_devices TO authenticated;

COMMIT;
