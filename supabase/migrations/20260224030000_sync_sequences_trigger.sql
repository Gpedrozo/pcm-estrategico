
-- Function to synchronize sequences with existing data
CREATE OR REPLACE FUNCTION public.sync_document_sequences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- OS
  UPDATE public.document_sequences
  SET ultimo_numero = COALESCE((SELECT MAX(numero_os) FROM public.ordens_servico), 0),
      updated_at = now()
  WHERE tipo_documento = 'ORDEM_SERVICO';

  -- Inspeção
  UPDATE public.document_sequences
  SET ultimo_numero = COALESCE((SELECT MAX(numero_inspecao) FROM public.inspecoes), 0),
      updated_at = now()
  WHERE tipo_documento = 'INSPECAO';

  -- Preventiva (Try to extract number from string code like PR-000001)
  -- This is more complex, but we can try to extract digits
  UPDATE public.document_sequences
  SET ultimo_numero = COALESCE(
    (SELECT MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::integer) FROM public.planos_preventivos),
    0
  ),
  updated_at = now()
  WHERE tipo_documento = 'PREVENTIVA';

  -- Lubrificação
  UPDATE public.document_sequences
  SET ultimo_numero = COALESCE(
    (SELECT MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::integer) FROM public.planos_lubrificacao),
    0
  ),
  updated_at = now()
  WHERE tipo_documento = 'LUBRIFICACAO';
END;
$$;

-- Trigger function to update sequence when a record is inserted
CREATE OR REPLACE FUNCTION public.handle_document_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo varchar;
  v_num integer;
BEGIN
  IF TG_TABLE_NAME = 'ordens_servico' THEN
    v_tipo := 'ORDEM_SERVICO';
    v_num := NEW.numero_os;
  ELSIF TG_TABLE_NAME = 'inspecoes' THEN
    v_tipo := 'INSPECAO';
    v_num := NEW.numero_inspecao;
  ELSIF TG_TABLE_NAME = 'planos_preventivos' THEN
    v_tipo := 'PREVENTIVA';
    v_num := COALESCE(NULLIF(regexp_replace(NEW.codigo, '\D', '', 'g'), '')::integer, 0);
  ELSIF TG_TABLE_NAME = 'planos_lubrificacao' THEN
    v_tipo := 'LUBRIFICACAO';
    v_num := COALESCE(NULLIF(regexp_replace(NEW.codigo, '\D', '', 'g'), '')::integer, 0);
  END IF;

  IF v_tipo IS NOT NULL AND v_num > 0 THEN
    UPDATE public.document_sequences
    SET ultimo_numero = GREATEST(ultimo_numero, v_num),
        updated_at = now()
    WHERE tipo_documento = v_tipo;
  END IF;

  RETURN NEW;
END;
$$;

-- Create Triggers
DROP TRIGGER IF EXISTS tr_sync_os_sequence ON public.ordens_servico;
CREATE TRIGGER tr_sync_os_sequence
AFTER INSERT ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.handle_document_insert();

DROP TRIGGER IF EXISTS tr_sync_inspecoes_sequence ON public.inspecoes;
CREATE TRIGGER tr_sync_inspecoes_sequence
AFTER INSERT ON public.inspecoes
FOR EACH ROW EXECUTE FUNCTION public.handle_document_insert();

DROP TRIGGER IF EXISTS tr_sync_preventiva_sequence ON public.planos_preventivos;
CREATE TRIGGER tr_sync_preventiva_sequence
AFTER INSERT ON public.planos_preventivos
FOR EACH ROW EXECUTE FUNCTION public.handle_document_insert();

DROP TRIGGER IF EXISTS tr_sync_lubrificacao_sequence ON public.planos_lubrificacao;
CREATE TRIGGER tr_sync_lubrificacao_sequence
AFTER INSERT ON public.planos_lubrificacao
FOR EACH ROW EXECUTE FUNCTION public.handle_document_insert();

-- Run initial sync
SELECT public.sync_document_sequences();
