-- ============================================================
-- Fix P2 — mecanicos.senha_hash: trigger de bcrypt automático
--
-- Problema: Mecanicos.tsx envia senha_hash=raw_password (plaintext).
--   Sem trigger, armazena texto puro. O crypt() no login falharia
--   pois bcrypt_hash(plaintext, invalid_salt) ≠ plaintext.
--
-- Solução: trigger BEFORE INSERT OR UPDATE
--   - se senha_hash não começa com '$2' → ainda não é bcrypt → hasheamos
--   - se já é bcrypt (começa com '$2b$' ou '$2a$') → não re-hashear
--
-- Isso também serve como hardening: mesmo que código futuro envie
-- senha em plaintext, o banco sempre armazena bcrypt.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mecanicos_auto_hash_senha()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.senha_hash IS NOT NULL
     AND length(NEW.senha_hash) > 0
     AND NEW.senha_hash NOT LIKE '$2%' THEN
    -- Plaintext detectado → bcrypt com fator 10
    NEW.senha_hash := extensions.crypt(NEW.senha_hash, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;

-- Garantir que coluna senha_hash existe
DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mecanicos' AND column_name = 'senha_hash'
  ) THEN
    ALTER TABLE public.mecanicos ADD COLUMN senha_hash text;
  END IF;
END $;

-- Aplicar nas duas tabelas de mecânicos (sistema legacy + padrão)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('mecanicos', 'mecanicos_v2')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_auto_hash_senha_mecanico ON public.%I', t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_auto_hash_senha_mecanico
       BEFORE INSERT OR UPDATE OF senha_hash ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.mecanicos_auto_hash_senha()',
      t
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.mecanicos_auto_hash_senha() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mecanicos_auto_hash_senha() TO service_role;
