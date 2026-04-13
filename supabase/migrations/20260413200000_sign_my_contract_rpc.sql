-- =============================================================================
-- Migration: RPC sign_my_contract
-- Permite que um usuário autenticado do tenant assine o contrato da própria empresa.
-- Usa SECURITY DEFINER para atualizar contracts sem expor policy de UPDATE ao tenant.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sign_my_contract(p_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_empresa_id uuid;
BEGIN
  -- Obtém a empresa_id do usuário chamador via profiles
  SELECT empresa_id INTO v_caller_empresa_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui empresa vinculada.';
  END IF;

  -- Atualiza somente se o contrato pertence à empresa do chamador e ainda não foi assinado
  UPDATE public.contracts
  SET
    signed_at = now(),
    signed_by = auth.uid(),
    status    = 'ativo',
    updated_by = auth.uid()
  WHERE
    id         = p_contract_id
    AND empresa_id = v_caller_empresa_id
    AND signed_at  IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado, não pertence à sua empresa ou já foi assinado.';
  END IF;
END;
$$;

-- Garante que apenas usuários autenticados podem chamar a função
REVOKE ALL ON FUNCTION public.sign_my_contract(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_my_contract(uuid) TO authenticated;

COMMENT ON FUNCTION public.sign_my_contract(uuid) IS
  'Registra a assinatura digital do contrato PCM Estratégico para o tenant autenticado. '
  'Valida que o contrato pertence à empresa do usuário e que ainda não foi assinado.';
