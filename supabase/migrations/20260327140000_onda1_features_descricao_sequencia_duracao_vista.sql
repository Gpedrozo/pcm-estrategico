-- ONDA 1 FEATURES
BEGIN;

ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS descricao_execucao text;

UPDATE public.ordens_servico
SET descricao_execucao = 'Execução não documentada (migração)'
WHERE status = 'FECHADA' AND descricao_execucao IS NULL;

ALTER TABLE public.ordens_servico
DROP CONSTRAINT IF EXISTS check_descricao_execucao_required;

ALTER TABLE public.ordens_servico
ADD CONSTRAINT check_descricao_execucao_required 
  CHECK (status != 'FECHADA' OR descricao_execucao IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.sequencia_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proximo_numero integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.sequencia_os ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sequencia_os_read ON public.sequencia_os;
CREATE POLICY sequencia_os_read ON public.sequencia_os
  FOR SELECT USING (true);

ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS empresa_id uuid;

ALTER TABLE public.ordens_servico
DROP CONSTRAINT IF EXISTS fk_ordens_servico_empresa_id;

ALTER TABLE public.ordens_servico
ADD CONSTRAINT fk_ordens_servico_empresa_id 
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.assign_numero_os_sequencial()
RETURNS TRIGGER AS \$\$
DECLARE
 v_proximo_numero integer;
BEGIN
  IF (NEW.numero_os IS NULL OR NEW.numero_os = 0) AND NEW.empresa_id IS NOT NULL THEN
    UPDATE public.sequencia_os
    SET proximo_numero = proximo_numero + 1
    WHERE empresa_id = NEW.empresa_id
    RETURNING proximo_numero INTO v_proximo_numero;
    
    IF v_proximo_numero IS NULL THEN
      INSERT INTO public.sequencia_os (empresa_id, proximo_numero)
      VALUES (NEW.empresa_id, 2)
      RETURNING proximo_numero INTO v_proximo_numero;
    END IF;
    
    NEW.numero_os := v_proximo_numero;
  END IF;
  
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_assign_numero_os_sequencial ON public.ordens_servico;

CREATE TRIGGER trigger_assign_numero_os_sequencial
BEFORE INSERT ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.assign_numero_os_sequencial();

ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS tempo_total_minutos integer;

CREATE OR REPLACE FUNCTION public.format_duracao(minutos integer)
RETURNS text AS \$\$
DECLARE
  v_horas integer;
  v_mins integer;
BEGIN
  IF minutos IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_horas := minutos / 60;
  v_mins := minutos % 60;
  
  IF v_horas > 0 AND v_mins > 0 THEN
    RETURN v_horas || '''h ''' || v_mins || '''min''';
  ELSIF v_horas > 0 THEN
    RETURN v_horas || '''h''';
  ELSIF v_mins > 0 THEN
    RETURN v_mins || '''min''';
  ELSE
    RETURN '''0min''';
  END IF;
END;
\$\$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calculate_tempo_total_on_close()
RETURNS TRIGGER AS \$\$
BEGIN
  IF NEW.status = '''FECHADA''' AND OLD.status != '''FECHADA''' THEN
    NEW.tempo_total_minutos := 
      EXTRACT(EPOCH FROM (COALESCE(NEW.data_fechamento, NOW()) - NEW.data_solicitacao)) / 60;
  END IF;
  
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_tempo_total ON public.ordens_servico;

CREATE TRIGGER trigger_calculate_tempo_total
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.calculate_tempo_total_on_close();

ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS vista boolean DEFAULT false;

ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS vista_por uuid;

ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS vista_em timestamptz;

ALTER TABLE public.ordens_servico
DROP CONSTRAINT IF EXISTS fk_ordens_servico_vista_por;

ALTER TABLE public.ordens_servico
ADD CONSTRAINT fk_ordens_servico_vista_por
  FOREIGN KEY (vista_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.marcar_os_como_vista(p_os_id uuid, p_usuario_id uuid)
RETURNS jsonb AS \$\$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.ordens_servico
  SET 
    vista = true,
    vista_por = p_usuario_id,
    vista_em = now()
  WHERE id = p_os_id;
  
  SELECT jsonb_build_object(
    '''success''', true,
    '''message''', '''OS marcada como vista''',
    '''vista_em''', vista_em,
    '''vista_por''', vista_por
  ) INTO v_result
  FROM public.ordens_servico
  WHERE id = p_os_id;
  
  RETURN COALESCE(v_result, jsonb_build_object('''success''', false, '''message''', '''OS não encontrada'''));
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.historico
ADD COLUMN IF NOT EXISTS descricao_execucao text;

ALTER TABLE public.historico
ADD COLUMN IF NOT EXISTS tempo_total_minutos integer;

DO \$\$
DECLARE
  v_count_seq integer;
  v_count_col_desc integer;
  v_count_col_tempo integer;
  v_count_col_vista integer;
  v_count_os_with_desc integer;
BEGIN
  SELECT COUNT(*) INTO v_count_seq 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'sequencia_os';
  
  SELECT COUNT(*) INTO v_count_col_desc 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'descricao_execucao';
  
  SELECT COUNT(*) INTO v_count_col_tempo 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'tempo_total_minutos';
  
  SELECT COUNT(*) INTO v_count_col_vista 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'vista';
  
  SELECT COUNT(*) INTO v_count_os_with_desc
  FROM public.ordens_servico
  WHERE status = 'FECHADA' AND descricao_execucao = 'Execução não documentada (migração)';
  
  RAISE NOTICE '''VALIDATION: sequencia_os table: %, descricao_execucao col: %, tempo_total_minutos col: %, vista cols: %, OSs migradas: %''',
    v_count_seq, v_count_col_desc, v_count_col_tempo, v_count_col_vista, v_count_os_with_desc;
END \$\$;

COMMIT;
