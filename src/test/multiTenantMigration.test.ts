import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('enterprise multi-tenant migration', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260301032000_enterprise_multitenant_foundation.sql',
  );

  it('creates core tenant and audit structures', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.empresas');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_current_empresa_id()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.detect_cross_tenant_access');
  });

  it('enforces tenant isolation policies and triggers', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('CREATE POLICY tenant_select');
    expect(sql).toContain('CREATE POLICY tenant_insert');
    expect(sql).toContain('CREATE POLICY tenant_update');
    expect(sql).toContain('CREATE POLICY tenant_delete');
    expect(sql).toContain('CREATE TRIGGER trg_enforce_empresa_id');
    expect(sql).toContain('CREATE TRIGGER trg_enterprise_audit');
    expect(sql).toContain('CREATE TRIGGER trg_prevent_master_ti_promotion');
  });
});
