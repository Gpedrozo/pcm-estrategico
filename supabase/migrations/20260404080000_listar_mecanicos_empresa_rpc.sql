-- ============================================================
-- RPC: listar_mecanicos_empresa
-- Retorna mecânicos ativos da empresa do dispositivo autenticado
-- SECURITY DEFINER garante que RLS não bloqueia a leitura
-- ============================================================

CREATE OR REPLACE FUNCTION public.listar_mecanicos_empresa(p_empresa_id uuid)
RETURNS TABLE(id uuid, nome text, tipo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Valida que empresa_id foi fornecido (segurança mínima)
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório';
  END IF;

  RETURN QUERY
    SELECT m.id, m.nome, m.tipo
    FROM mecanicos m
    WHERE m.empresa_id = p_empresa_id
      AND m.ativo = true
      AND m.deleted_at IS NULL
    ORDER BY m.nome;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_mecanicos_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_mecanicos_empresa(uuid) TO anon;

NOTIFY pgrst, 'reload schema';
