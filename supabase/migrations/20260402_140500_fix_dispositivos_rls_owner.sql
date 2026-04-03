-- Fix RLS policies for dispositivos_moveis and qrcodes_vinculacao
-- Date: 2026-04-02 14:05
-- Purpose: Allow SYSTEM_OWNER to access dispositivos (was blocked by conflicting policies)
-- Issue: separate tenant_read and owner_read policies evaluated sequentially, tenant_read blocked owner before owner_read could allow

BEGIN;

-- Drop conflicting separate policies from 20260325140000_dispositivos_moveis_qrcodes.sql
DROP POLICY IF EXISTS "dispositivos_moveis_tenant_read" ON public.dispositivos_moveis;
DROP POLICY IF EXISTS "dispositivos_moveis_owner_read" ON public.dispositivos_moveis;
DROP POLICY IF EXISTS "dispositivos_moveis_tenant_update" ON public.dispositivos_moveis;
DROP POLICY IF EXISTS "dispositivos_moveis_owner_update" ON public.dispositivos_moveis;
DROP POLICY IF EXISTS "dispositivos_moveis_tenant_insert" ON public.dispositivos_moveis;
DROP POLICY IF EXISTS "dispositivos_moveis_tenant_delete" ON public.dispositivos_moveis;

-- Create unified policies for dispositivos_moveis with OR conditions
CREATE POLICY "dispositivos_moveis_read" ON public.dispositivos_moveis FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "dispositivos_moveis_write" ON public.dispositivos_moveis FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "dispositivos_moveis_upd" ON public.dispositivos_moveis FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "dispositivos_moveis_del" ON public.dispositivos_moveis FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

-- Drop conflicting policies for qrcodes_vinculacao
DROP POLICY IF EXISTS "qrcodes_vinculacao_tenant_read" ON public.qrcodes_vinculacao;
DROP POLICY IF EXISTS "qrcodes_vinculacao_owner_all" ON public.qrcodes_vinculacao;
DROP POLICY IF EXISTS "qrcodes_vinculacao_tenant_insert" ON public.qrcodes_vinculacao;
DROP POLICY IF EXISTS "qrcodes_vinculacao_tenant_update" ON public.qrcodes_vinculacao;
DROP POLICY IF EXISTS "qrcodes_vinculacao_tenant_delete" ON public.qrcodes_vinculacao;

-- Create unified policies for qrcodes_vinculacao with OR conditions
CREATE POLICY "qrcodes_read" ON public.qrcodes_vinculacao FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "qrcodes_write" ON public.qrcodes_vinculacao FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "qrcodes_upd" ON public.qrcodes_vinculacao FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "qrcodes_del" ON public.qrcodes_vinculacao FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

COMMIT;
