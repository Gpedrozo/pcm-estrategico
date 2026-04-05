-- ============================================================
-- RPC: login_mecanico
-- Called by the mobile app (anon role) to authenticate a mechanic.
-- Combines lookup + password validation in SECURITY DEFINER
-- so the anon role doesn't need direct SELECT on mecanicos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.login_mecanico(
  p_empresa_id uuid,
  p_codigo text,
  p_senha text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mec record;
BEGIN
  -- Find mechanic by empresa + codigo_acesso
  SELECT id, nome, codigo_acesso, senha_acesso, ativo,
         ferias_inicio, ferias_fim
  INTO v_mec
  FROM mecanicos
  WHERE empresa_id = p_empresa_id
    AND codigo_acesso = UPPER(p_codigo)
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_mec IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de acesso não encontrado');
  END IF;

  IF NOT v_mec.ativo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mecânico inativo');
  END IF;

  -- Validate password (if set)
  IF v_mec.senha_acesso IS NOT NULL AND v_mec.senha_acesso <> '' THEN
    IF v_mec.senha_acesso <> p_senha THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Senha incorreta');
    END IF;
  END IF;

  -- Check vacation
  IF v_mec.ferias_inicio IS NOT NULL AND v_mec.ferias_fim IS NOT NULL
     AND CURRENT_DATE BETWEEN v_mec.ferias_inicio AND v_mec.ferias_fim THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Mecânico em período de férias (' || v_mec.ferias_inicio || ' a ' || v_mec.ferias_fim || ')'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mecanico_id', v_mec.id,
    'mecanico_nome', v_mec.nome,
    'codigo_acesso', v_mec.codigo_acesso
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_mecanico(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.login_mecanico(uuid, text, text) TO authenticated;