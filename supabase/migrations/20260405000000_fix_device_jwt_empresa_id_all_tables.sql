-- ============================================================
-- CRITICAL FIX: Device auth JWT empresa_id compatibility
-- 
-- ROOT CAUSE: A edge function mecanico-device-auth armazena empresa_id
-- dentro de app_metadata no JWT, mas as funções RLS só checam o nível raiz.
-- Isso faz com que TODAS as queries retornem vazio para usuários do app.
--
-- FIX: Atualiza get_current_empresa_id() e current_empresa_id() para
-- checar AMBOS os paths do JWT (raiz e app_metadata).
-- ============================================================

-- 1) Fix get_current_empresa_id() — principal função usada pelas policies
CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Path 1: JWT root level (web app normal login)
  BEGIN
    v_empresa_id := NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  -- Path 2: JWT app_metadata (device auth / edge function)
  BEGIN
    v_empresa_id := NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  -- Path 3: JWT user_metadata (fallback adicional)
  BEGIN
    v_empresa_id := NULLIF(auth.jwt() -> 'user_metadata' ->> 'empresa_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  -- Path 4: user_roles table
  SELECT ur.empresa_id INTO v_empresa_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY ur.created_at
  LIMIT 1;

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  -- Path 5: profiles table (último fallback)
  SELECT p.empresa_id INTO v_empresa_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN v_empresa_id;
END;
$$;

-- 2) Fix current_empresa_id() — função alternativa usada em alguns contextos
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid,
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'empresa_id', '')::uuid,
    (SELECT me.empresa_id FROM public.membros_empresa me WHERE me.user_id = auth.uid() AND me.status = 'active' ORDER BY me.created_at LIMIT 1),
    (SELECT ur.empresa_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() ORDER BY ur.created_at LIMIT 1),
    (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );
$$;

-- 3) Fix can_access_empresa() — adiciona check de JWT app_metadata
CREATE OR REPLACE FUNCTION public.can_access_empresa(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      -- Direct JWT match (root or app_metadata)
      p_empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
      OR p_empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
      OR p_empresa_id = NULLIF(auth.jwt() -> 'user_metadata' ->> 'empresa_id', '')::uuid
      -- System-level admin roles
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
      )
      -- User has any role in this empresa
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.empresa_id = p_empresa_id
      )
    );
$$;

-- 4) Ensure grants
REVOKE EXECUTE ON FUNCTION public.get_current_empresa_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO anon;

REVOKE EXECUTE ON FUNCTION public.current_empresa_id() FROM public;
GRANT EXECUTE ON FUNCTION public.current_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_empresa_id() TO anon;

REVOKE EXECUTE ON FUNCTION public.can_access_empresa(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_empresa(uuid) TO authenticated;
