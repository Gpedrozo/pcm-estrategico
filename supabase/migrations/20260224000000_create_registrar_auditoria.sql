CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_nome text;
BEGIN
  SELECT COALESCE(p.nome, 'system')
  INTO v_usuario_nome
  FROM public.profiles p
  WHERE p.id = auth.uid();

  INSERT INTO public.auditoria (usuario_id, usuario_nome, acao, descricao, tag)
  VALUES (
    auth.uid(),
    COALESCE(v_usuario_nome, 'system'),
    TG_OP,
    TG_TABLE_NAME,
    NULL
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
