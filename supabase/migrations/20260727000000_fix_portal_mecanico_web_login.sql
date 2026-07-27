-- Migration: Correção do login no Portal do Mecânico
-- Problema: validar_credenciais_mecanico_servidor referencia coluna 'email' que não existe

BEGIN;

-- ============================================================
-- 1) UNIQUE INDEX em codigo_acesso
-- ============================================================
DROP INDEX IF EXISTS idx_mecanicos_empresa_codigo_acesso;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mecanicos_empresa_codigo_acesso_unique 
  ON public.mecanicos (empresa_id, codigo_acesso) 
  WHERE codigo_acesso IS NOT NULL;

-- ============================================================
-- 2) Recria registrar_login_mecanico (adiciona ultimo_login_portal)
-- ============================================================
DROP FUNCTION IF EXISTS public.registrar_login_mecanico CASCADE;

CREATE OR REPLACE FUNCTION public.registrar_login_mecanico(
  p_empresa_id UUID,
  p_mecanico_id UUID,
  p_codigo_acesso TEXT DEFAULT NULL,
  p_dispositivo_id UUID DEFAULT NULL,
  p_device_token UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session_id UUID;
BEGIN
  INSERT INTO log_mecanicos_login (empresa_id, dispositivo_id, mecanico_id, device_token, codigo_acesso, ip_address, user_agent, device_name, status)
  VALUES (p_empresa_id, p_dispositivo_id, p_mecanico_id, p_device_token, p_codigo_acesso, p_ip_address, p_user_agent, p_device_name, 'ATIVO')
  RETURNING id INTO v_session_id;

  UPDATE public.mecanicos SET ultimo_login_portal = now() WHERE id = p_mecanico_id;

  RETURN jsonb_build_object('session_id', v_session_id, 'login_em', now());
END;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_login_mecanico TO authenticated, anon;

-- ============================================================
-- 3) Recria validar_credenciais_mecanico_servidor (SEM email)
-- ============================================================
DROP FUNCTION IF EXISTS public.validar_credenciais_mecanico_servidor CASCADE;

CREATE OR REPLACE FUNCTION public.validar_credenciais_mecanico_servidor(
  p_empresa_id UUID,
  p_codigo_acesso TEXT,
  p_senha_acesso TEXT,
  p_dispositivo_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mecanico public.mecanicos;
BEGIN
  SELECT * INTO v_mecanico FROM public.mecanicos
  WHERE empresa_id = p_empresa_id AND codigo_acesso = p_codigo_acesso;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'resultado', 'MECANICO_NAO_ENCONTRADO');
  END IF;

  IF NOT v_mecanico.ativo THEN
    RETURN jsonb_build_object('ok', false, 'resultado', 'MECANICO_INATIVO');
  END IF;

  IF v_mecanico.senha_acesso IS NOT NULL AND v_mecanico.senha_acesso != p_senha_acesso THEN
    RETURN jsonb_build_object('ok', false, 'resultado', 'SENHA_INCORRETA');
  END IF;

  -- ⚡ SUCESSO: SEM referencia a email
  RETURN jsonb_build_object(
    'ok', true, 'resultado', 'SUCESSO',
    'mecanico_id', v_mecanico.id,
    'mecanico_nome', v_mecanico.nome,
    'tentativas', 0
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.validar_credenciais_mecanico_servidor TO authenticated, anon;

COMMIT;