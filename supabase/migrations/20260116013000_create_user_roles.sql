BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('ADMIN', 'USUARIO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role public.app_role DEFAULT 'USUARIO'::public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_pkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE ONLY public.user_roles
      ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE ONLY public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE ONLY public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING ((auth.uid() = user_id));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

COMMIT;
