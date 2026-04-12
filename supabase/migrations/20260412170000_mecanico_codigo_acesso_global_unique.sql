-- ============================================================
-- Migration: Código de acesso do mecânico globalmente único
-- Date: 2026-04-12
-- Problem: codigo_acesso "MEC-001" pode existir em múltiplos
--   tenants, causando colisão no login do portal web (a RPC
--   resolver_empresa_mecanico pega LIMIT 1 aleatório).
-- Solution:
--   1. Migrar códigos existentes para o formato SLUG-NNN
--   2. Trigger auto-gera SLUG-NNN no INSERT (se código vazio)
--   3. UNIQUE constraint global no codigo_acesso
--   4. RPC resolver_empresa_mecanico retorna erro se ambíguo
-- ============================================================

-- ============================================================
-- STEP 1: Migrar códigos existentes para formato SLUG-NNN
-- Mecânicos sem codigo_acesso recebem um automático.
-- Mecânicos com codigo genérico (MEC-NNN) recebem SLUG-NNN.
-- Mecânicos com código já contendo o slug ficam inalterados.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  v_slug text;
  v_seq int;
  v_new_code text;
BEGIN
  FOR r IN
    SELECT m.id, m.empresa_id, m.codigo_acesso,
           UPPER(COALESCE(e.slug, SUBSTRING(e.nome FROM 1 FOR 3))) AS emp_slug
      FROM public.mecanicos m
      JOIN public.empresas e ON e.id = m.empresa_id
     ORDER BY m.empresa_id, m.created_at
  LOOP
    v_slug := r.emp_slug;

    -- Skip if already has SLUG prefix (contains '-' after a slug-like prefix)
    IF r.codigo_acesso IS NOT NULL
       AND r.codigo_acesso ~ ('^' || v_slug || '-\d+$')
    THEN
      CONTINUE;
    END IF;

    -- Get next sequence for this empresa
    SELECT COALESCE(MAX(
      CASE
        WHEN m2.codigo_acesso ~ ('^' || v_slug || '-\d+$')
        THEN SUBSTRING(m2.codigo_acesso FROM '-(\d+)$')::int
        ELSE 0
      END
    ), 0) + 1
    INTO v_seq
    FROM public.mecanicos m2
    WHERE m2.empresa_id = r.empresa_id;

    -- But we need seq per iteration within same empresa, so use a subquery
    -- Actually: count already-migrated codes for this empresa in this run
    SELECT COUNT(*) + 1 INTO v_seq
      FROM public.mecanicos m2
     WHERE m2.empresa_id = r.empresa_id
       AND m2.codigo_acesso ~ ('^' || v_slug || '-\d+$');

    v_new_code := v_slug || '-' || LPAD(v_seq::text, 3, '0');

    -- Ensure no collision (add suffix if needed)
    WHILE EXISTS (SELECT 1 FROM public.mecanicos WHERE codigo_acesso = v_new_code AND id != r.id) LOOP
      v_seq := v_seq + 1;
      v_new_code := v_slug || '-' || LPAD(v_seq::text, 3, '0');
    END LOOP;

    UPDATE public.mecanicos SET codigo_acesso = v_new_code WHERE id = r.id;
  END LOOP;
END$$;

-- ============================================================
-- STEP 2: Função de auto-geração de código com slug da empresa
-- Chamada por trigger BEFORE INSERT. Se codigo_acesso vazio ou
-- NULL, gera automaticamente SLUG-NNN (next sequential).
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_auto_codigo_acesso_mecanico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_seq int;
  v_new_code text;
BEGIN
  -- Only auto-generate if codigo_acesso is empty/null
  IF NEW.codigo_acesso IS NOT NULL AND TRIM(NEW.codigo_acesso) != '' THEN
    -- Normalize to UPPER
    NEW.codigo_acesso := UPPER(TRIM(NEW.codigo_acesso));
    RETURN NEW;
  END IF;

  -- Get empresa slug
  SELECT UPPER(COALESCE(e.slug, SUBSTRING(e.nome FROM 1 FOR 3)))
    INTO v_slug
    FROM public.empresas e
   WHERE e.id = NEW.empresa_id;

  IF v_slug IS NULL THEN
    v_slug := 'MEC';
  END IF;

  -- Get next sequence number for this empresa's codes
  SELECT COALESCE(MAX(
    CASE
      WHEN codigo_acesso ~ ('^' || v_slug || '-\d+$')
      THEN SUBSTRING(codigo_acesso FROM '-(\d+)$')::int
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM public.mecanicos
  WHERE empresa_id = NEW.empresa_id;

  v_new_code := v_slug || '-' || LPAD(v_seq::text, 3, '0');

  -- Ensure global uniqueness (loop in case of race condition)
  WHILE EXISTS (SELECT 1 FROM public.mecanicos WHERE codigo_acesso = v_new_code) LOOP
    v_seq := v_seq + 1;
    v_new_code := v_slug || '-' || LPAD(v_seq::text, 3, '0');
  END LOOP;

  NEW.codigo_acesso := v_new_code;
  RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_auto_codigo_acesso ON public.mecanicos;
CREATE TRIGGER trg_auto_codigo_acesso
  BEFORE INSERT ON public.mecanicos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_codigo_acesso_mecanico();

-- ============================================================
-- STEP 3: UNIQUE constraint global no codigo_acesso
-- Agora que todos os códigos são únicos, podemos enforce.
-- ============================================================

-- Drop old non-unique index (if exists)
DROP INDEX IF EXISTS idx_mecanicos_empresa_codigo_acesso;

-- Create UNIQUE index (global, not per-tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mecanicos_codigo_acesso_unique
  ON public.mecanicos (codigo_acesso)
  WHERE codigo_acesso IS NOT NULL;

-- Keep a non-unique index for (empresa_id, codigo_acesso) lookups
CREATE INDEX IF NOT EXISTS idx_mecanicos_empresa_codigo
  ON public.mecanicos (empresa_id, codigo_acesso);

-- ============================================================
-- STEP 4: Atualizar RPC resolver_empresa_mecanico
-- Agora que codigo_acesso é globalmente único, retorna direto.
-- Se por algum motivo houver ambiguidade (dados legados),
-- retorna NULL com log de warning.
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolver_empresa_mecanico(p_codigo_acesso text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_count int;
BEGIN
  -- Count how many active mechanics have this code
  SELECT COUNT(*), MIN(empresa_id)
    INTO v_count, v_empresa_id
    FROM mecanicos
   WHERE UPPER(codigo_acesso) = UPPER(TRIM(p_codigo_acesso))
     AND ativo = true;

  -- Exact 1 match: return empresa_id
  IF v_count = 1 THEN
    RETURN v_empresa_id;
  END IF;

  -- 0 matches: code not found
  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Multiple matches (should not happen with UNIQUE constraint, but safety net)
  -- Return NULL to force user to use subdomain login
  RAISE WARNING 'resolver_empresa_mecanico: ambiguous codigo_acesso "%" found in % tenants',
    p_codigo_acesso, v_count;
  RETURN NULL;
END;
$$;

-- Permissions (re-grant after CREATE OR REPLACE)
GRANT EXECUTE ON FUNCTION public.resolver_empresa_mecanico(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_auto_codigo_acesso_mecanico() TO service_role;

-- ============================================================
-- STEP 5: RPC para o frontend buscar o próximo código sugerido
-- Usada pelo botão "Gerar código" no cadastro de mecânicos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sugerir_codigo_acesso_mecanico(p_empresa_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_seq int;
  v_new_code text;
BEGIN
  SELECT UPPER(COALESCE(e.slug, SUBSTRING(e.nome FROM 1 FOR 3)))
    INTO v_slug
    FROM public.empresas e
   WHERE e.id = p_empresa_id;

  IF v_slug IS NULL THEN
    v_slug := 'MEC';
  END IF;

  SELECT COALESCE(MAX(
    CASE
      WHEN codigo_acesso ~ ('^' || v_slug || '-\d+$')
      THEN SUBSTRING(codigo_acesso FROM '-(\d+)$')::int
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM public.mecanicos
  WHERE empresa_id = p_empresa_id;

  v_new_code := v_slug || '-' || LPAD(v_seq::text, 3, '0');

  -- Check global uniqueness
  WHILE EXISTS (SELECT 1 FROM public.mecanicos WHERE codigo_acesso = v_new_code) LOOP
    v_seq := v_seq + 1;
    v_new_code := v_slug || '-' || LPAD(v_seq::text, 3, '0');
  END LOOP;

  RETURN v_new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sugerir_codigo_acesso_mecanico(uuid) TO authenticated;

-- ============================================================
-- DONE:
--   ✓ Migrated existing codes to SLUG-NNN format
--   ✓ Trigger auto-generates SLUG-NNN on INSERT
--   ✓ UNIQUE constraint on codigo_acesso (global)
--   ✓ RPC resolver_empresa_mecanico handles ambiguity safely
--   ✓ RPC sugerir_codigo_acesso_mecanico for frontend preview
-- ============================================================
