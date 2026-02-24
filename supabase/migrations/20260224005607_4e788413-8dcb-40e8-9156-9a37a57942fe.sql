
-- Table to manage document numbering sequences
CREATE TABLE public.document_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_documento varchar NOT NULL UNIQUE,
  prefixo varchar NOT NULL,
  ultimo_numero integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sequences" ON public.document_sequences
  FOR SELECT USING (true);

CREATE POLICY "Admins and Masters can manage sequences" ON public.document_sequences
  FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'MASTER_TI'::app_role));

-- Seed initial sequences
INSERT INTO public.document_sequences (tipo_documento, prefixo, ultimo_numero) VALUES
  ('ORDEM_SERVICO', 'OS', 0),
  ('PREVENTIVA', 'PR', 0),
  ('LUBRIFICACAO', 'LB', 0),
  ('INSPECAO', 'IN', 0),
  ('RELATORIO', 'RL', 0);

-- Function to get next document number atomically
CREATE OR REPLACE FUNCTION public.next_document_number(p_tipo varchar)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefixo varchar;
  v_numero integer;
BEGIN
  UPDATE public.document_sequences
  SET ultimo_numero = ultimo_numero + 1, updated_at = now()
  WHERE tipo_documento = p_tipo
  RETURNING prefixo, ultimo_numero INTO v_prefixo, v_numero;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tipo de documento não encontrado: %', p_tipo;
  END IF;

  RETURN v_prefixo || '-' || LPAD(v_numero::text, 6, '0');
END;
$$;

-- Table for document layout versions
CREATE TABLE public.document_layouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_documento varchar NOT NULL,
  versao varchar NOT NULL DEFAULT '1.0',
  nome varchar NOT NULL,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  autor_nome varchar,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.document_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view layouts" ON public.document_layouts
  FOR SELECT USING (true);

CREATE POLICY "Admins and Masters can manage layouts" ON public.document_layouts
  FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'MASTER_TI'::app_role));

-- Seed default layouts
INSERT INTO public.document_layouts (tipo_documento, versao, nome, configuracao) VALUES
  ('ORDEM_SERVICO', '1.0', 'Layout Padrão OS', '{"campos_visiveis":["numero_os","tag","equipamento","tipo","prioridade","status","data_solicitacao","solicitante","problema"],"mostrar_logo":true,"mostrar_cnpj":true,"mostrar_assinaturas":true,"mostrar_materiais":true,"mostrar_observacoes":true}'::jsonb),
  ('PREVENTIVA', '1.0', 'Layout Padrão Preventiva', '{"campos_visiveis":["codigo","tag","nome","tipo_gatilho","frequencia_dias","proxima_execucao","atividades","servicos"],"mostrar_logo":true,"mostrar_cnpj":true,"mostrar_assinaturas":true,"mostrar_checklist":true,"mostrar_materiais":true}'::jsonb);

-- Audit trigger
CREATE TRIGGER audit_document_layouts
  AFTER INSERT OR UPDATE OR DELETE ON public.document_layouts
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER audit_document_sequences
  AFTER INSERT OR UPDATE OR DELETE ON public.document_sequences
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
