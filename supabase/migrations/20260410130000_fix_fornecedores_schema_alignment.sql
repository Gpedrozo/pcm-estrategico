-- ============================================================
-- FIX: Módulo Fornecedores — alinhar schema DB com frontend
--
-- Problema: O frontend envia razao_social, nome_fantasia, tipo, etc.
-- mas a tabela só tem: nome, cnpj, contato, ativo.
-- Resultado: "null value in column 'nome' violates not-null constraint"
--
-- Solução: Adicionar todas as colunas faltantes e manter nome sincronizado
-- via trigger para backward-compatibility.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. ADICIONAR COLUNAS FALTANTES
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'PRESTADOR'
    CHECK (tipo IN ('PRESTADOR', 'FORNECEDOR', 'AMBOS')),
  ADD COLUMN IF NOT EXISTS especialidade TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS contato_nome TEXT,
  ADD COLUMN IF NOT EXISTS contato_telefone TEXT,
  ADD COLUMN IF NOT EXISTS avaliacao_media NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_avaliacoes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Unique parcial para codigo (se ainda não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'ux_fornecedores_codigo'
  ) THEN
    CREATE UNIQUE INDEX ux_fornecedores_codigo
      ON public.fornecedores(empresa_id, codigo)
      WHERE codigo IS NOT NULL AND codigo != 'AUTO';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. MIGRAR DADOS EXISTENTES: nome → razao_social
-- ─────────────────────────────────────────────────────────────

UPDATE public.fornecedores
SET razao_social = nome
WHERE razao_social IS NULL AND nome IS NOT NULL;

-- Agora que todos os registros têm razao_social, torná-la NOT NULL
ALTER TABLE public.fornecedores
  ALTER COLUMN razao_social SET NOT NULL;

-- Tornar nome nullable (razao_social é a nova coluna primária)
ALTER TABLE public.fornecedores
  ALTER COLUMN nome DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. TRIGGER: manter nome sincronizado com razao_social
--    (backward-compat para código legado que lê 'nome')
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fornecedores_sync_nome()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sempre sincronizar nome com razao_social
  NEW.nome := COALESCE(NEW.razao_social, NEW.nome);
  -- Se contato_nome foi enviado e contato está vazio, sincronizar
  IF NEW.contato IS NULL AND NEW.contato_nome IS NOT NULL THEN
    NEW.contato := NEW.contato_nome;
  END IF;
  -- Se contato foi enviado e contato_nome está vazio, sincronizar reverso
  IF NEW.contato_nome IS NULL AND NEW.contato IS NOT NULL THEN
    NEW.contato_nome := NEW.contato;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fornecedores_sync_nome ON public.fornecedores;
CREATE TRIGGER trg_fornecedores_sync_nome
  BEFORE INSERT OR UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.trg_fornecedores_sync_nome();

-- ─────────────────────────────────────────────────────────────
-- 4. GERAR CÓDIGO SEQUENCIAL AUTOMÁTICO
--    (resolve o problema de codigo = 'AUTO')
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fornecedores_auto_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' OR NEW.codigo = 'AUTO' THEN
    SELECT COALESCE(MAX(
      CASE WHEN codigo ~ '^\d+$' THEN codigo::int ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.fornecedores
    WHERE empresa_id = NEW.empresa_id;

    NEW.codigo := LPAD(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fornecedores_auto_codigo ON public.fornecedores;
CREATE TRIGGER trg_fornecedores_auto_codigo
  BEFORE INSERT ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.trg_fornecedores_auto_codigo();

-- Corrigir registros existentes com codigo = 'AUTO'
DO $$
DECLARE
  rec RECORD;
  v_seq INT := 0;
BEGIN
  FOR rec IN
    SELECT id, empresa_id FROM public.fornecedores
    WHERE codigo IS NULL OR codigo = '' OR codigo = 'AUTO'
    ORDER BY created_at
  LOOP
    v_seq := v_seq + 1;
    UPDATE public.fornecedores
    SET codigo = LPAD(v_seq::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. GRANTS (manter acesso existente)
-- ─────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;

COMMIT;
