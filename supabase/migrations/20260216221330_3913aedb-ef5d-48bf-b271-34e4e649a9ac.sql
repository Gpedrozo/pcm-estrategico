
-- Fix profiles: allow admins and masters to see all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

-- Fix profiles: allow admins and masters to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id 
    OR has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

-- Fix user_roles: allow MASTER_TI to manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins and Masters can manage roles" ON public.user_roles
  FOR ALL USING (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins and Masters can view all roles" ON public.user_roles
  FOR SELECT USING (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
    OR auth.uid() = user_id
  );

-- Fix dados_empresa: allow MASTER_TI
DROP POLICY IF EXISTS "Admins can update empresa" ON public.dados_empresa;
CREATE POLICY "Admins and Masters can update empresa" ON public.dados_empresa
  FOR UPDATE USING (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

DROP POLICY IF EXISTS "Admins can insert empresa" ON public.dados_empresa;
CREATE POLICY "Admins and Masters can insert empresa" ON public.dados_empresa
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

-- Fix permissoes_granulares: allow MASTER_TI
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissoes_granulares;
CREATE POLICY "Admins and Masters can manage permissions" ON public.permissoes_granulares
  FOR ALL USING (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

-- Fix configuracoes_sistema: allow MASTER_TI to update and insert
DROP POLICY IF EXISTS "Admins podem atualizar configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "Admins and Masters can update configs" ON public.configuracoes_sistema
  FOR UPDATE USING (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

-- Allow insert for admins/masters on configuracoes_sistema
CREATE POLICY "Admins and Masters can insert configs" ON public.configuracoes_sistema
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );

-- Fix security_logs: allow MASTER_TI to view
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_logs;
CREATE POLICY "Admins and Masters can view security logs" ON public.security_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'MASTER_TI'::app_role)
  );
