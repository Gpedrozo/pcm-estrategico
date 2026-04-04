-- ============================================================
-- RPC: validar_senha_mecanico
-- Valida a senha de acesso do mecânico sem expor o valor ao client
-- Retorna true/false
-- ============================================================

CREATE OR REPLACE FUNCTION public.validar_senha_mecanico(
  p_mecanico_id uuid,
  p_senha text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_senha_cadastrada text;
BEGIN
  SELECT senha_acesso INTO v_senha_cadastrada
  FROM mecanicos
  WHERE id = p_mecanico_id
    AND ativo = true
    AND deleted_at IS NULL;

  IF v_senha_cadastrada IS NULL THEN
    -- Mecânico sem senha cadastrada → permite acesso (backward compat)
    RETURN true;
  END IF;

  RETURN v_senha_cadastrada = p_senha;
END;
$$;

-- Permitir que dispositivos autenticados (role anon/authenticated) chamem a RPC
GRANT EXECUTE ON FUNCTION public.validar_senha_mecanico(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_senha_mecanico(uuid, text) TO anon;
