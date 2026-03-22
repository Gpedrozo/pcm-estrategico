-- ============================================================================
-- Migration: Restaurar trigger on_auth_user_created + handle_new_user()
-- Data: 2026-03-22
-- Motivo: Trigger e função foram removidos durante cleanup do Owner2,
--         causando criação de auth.users sem profiles/user_roles associados
--         e erros 500 "Database error querying schema" no GoTrue.
-- ============================================================================

-- 1. Recriar a função handle_new_user (adaptada ao schema atual)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_empresa_id uuid;
  v_role app_role;
BEGIN
  -- Extrair empresa_id do metadata do usuário (app_metadata tem prioridade)
  v_empresa_id := COALESCE(
    NULLIF(NEW.raw_app_meta_data ->> 'empresa_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data ->> 'empresa_id', '')::uuid,
    (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
  );

  -- Se não há empresa_id disponível, não bloquear o insert (GoTrue precisa)
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extrair role do metadata (app_metadata tem prioridade)
  v_role := COALESCE(
    NULLIF(NEW.raw_app_meta_data ->> 'role', '')::app_role,
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::app_role,
    'USUARIO'::app_role
  );

  -- Criar profile
  INSERT INTO public.profiles (id, empresa_id, nome, email)
  VALUES (
    NEW.id,
    v_empresa_id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nome', ''), NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar role
  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (NEW.id, v_empresa_id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

-- 2. Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Garantir permissões corretas
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
