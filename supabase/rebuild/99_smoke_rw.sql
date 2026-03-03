DO $$
DECLARE
  v_empresa_id uuid;
  v_id uuid;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas ORDER BY created_at ASC LIMIT 1;
  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, slug, status, plano)
    VALUES ('GPPIS', 'gppis', 'active', 'enterprise')
    RETURNING id INTO v_empresa_id;
  END IF;

  INSERT INTO public.configuracoes_sistema (empresa_id, chave, valor)
  VALUES (v_empresa_id, 'smoke.test.integracao', jsonb_build_object('ok', true, 'source', 'copilot'))
  ON CONFLICT (empresa_id, chave) DO UPDATE
    SET valor = EXCLUDED.valor,
        updated_at = now()
  RETURNING id INTO v_id;

  RAISE NOTICE 'WRITE_OK id=% empresa=%', v_id, v_empresa_id;
END $$;

SELECT chave, valor, updated_at
FROM public.configuracoes_sistema
WHERE chave = 'smoke.test.integracao'
ORDER BY updated_at DESC
LIMIT 1;

DELETE FROM public.configuracoes_sistema
WHERE chave = 'smoke.test.integracao';

SELECT COUNT(*) AS remaining_after_cleanup
FROM public.configuracoes_sistema
WHERE chave = 'smoke.test.integracao';
