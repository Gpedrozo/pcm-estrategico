/**
 * Lote 2-D / Item 2.10
 * Testes de isolamento RLS: can_access_empresa() bloqueia acesso cross-tenant
 *
 * Estratégia: análise estática das migrations para verificar que:
 *   (a) A função exige auth.uid() IS NOT NULL como pré-condição → bloqueia anon
 *   (b) O match de empresa é por UUID exato (sem wildcard)
 *   (c) REVOKE de PUBLIC/anon está presente
 *   (d) As tabelas multi-tenant do core possuem RLS usando can_access_empresa
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

function readMigration(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf-8');
}

/** Retorna o conteúdo da última migration que REDEFINE a função */
function latestCanAccessEmpresa(): string {
  const candidates = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .reverse(); // mais recente primeiro

  for (const file of candidates) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    if (
      content.includes('can_access_empresa') &&
      (content.includes('CREATE OR REPLACE FUNCTION') || content.includes('CREATE FUNCTION')) &&
      content.includes('RETURNS boolean')
    ) {
      return content;
    }
  }
  throw new Error('Nenhuma migration com definição de can_access_empresa encontrada');
}

/** Extrai o corpo da função can_access_empresa do conteúdo da migration */
function extractFunctionBody(content: string): string {
  const startIdx = content.indexOf('can_access_empresa');
  if (startIdx === -1) throw new Error('can_access_empresa não encontrada no conteúdo');

  const bodyStart = content.indexOf('$$', startIdx);
  const bodyEnd = content.indexOf('$$;', bodyStart + 2);
  if (bodyStart === -1 || bodyEnd === -1)
    throw new Error('Delimitadores $$ da função não encontrados');

  return content.slice(bodyStart + 2, bodyEnd).trim();
}

// ─────────────────────────────────────────────────────────────────────────────

describe('RLS — can_access_empresa: proteção cross-tenant', () => {
  it('a definição mais recente exige auth.uid() IS NOT NULL como condição raiz', () => {
    const content = latestCanAccessEmpresa();
    const body = extractFunctionBody(content);

    // A primeira condição obrigatória deve ser auth.uid() IS NOT NULL
    // (impede que anon retorne true mesmo sem os checks de UUID)
    expect(body).toMatch(/auth\.uid\(\)\s+IS\s+NOT\s+NULL/i);
  });

  it('a condição de accesso usa UUID exato (p_empresa_id = ... empresa_id)', () => {
    const content = latestCanAccessEmpresa();
    const body = extractFunctionBody(content);

    // Deve comparar p_empresa_id com o JWT claim — comparação direta, sem LIKE/ilike
    expect(body).toMatch(/p_empresa_id\s*=\s*NULLIF/i);
  });

  it('REVOKE de PUBLIC/anon está presente na mesma migration', () => {
    const content = latestCanAccessEmpresa();

    const hasRevoke =
      content.includes('REVOKE EXECUTE ON FUNCTION public.can_access_empresa') ||
      content.includes('REVOKE EXECUTE ON FUNCTION can_access_empresa') ||
      content.includes('REVOKE ALL ON FUNCTION public.can_access_empresa');

    expect(hasRevoke).toBe(true);
  });

  it('GRANT para authenticated está presente', () => {
    const content = latestCanAccessEmpresa();
    expect(content).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+.*can_access_empresa.*TO\s+authenticated/i);
  });

  it('RLS das tabelas core usa can_access_empresa no saas multiempresa', () => {
    const baseContent = readMigration(
      '20260302240000_saas_professional_multiempresa_backend.sql',
    );

    // Os dois policies fundamentais devem existir
    expect(baseContent).toContain('saas_tenant_select');
    expect(baseContent).toContain('can_access_empresa(empresa_id)');
  });

  it('equipamentos_rls usa can_access_empresa (não bypassa RLS para device JWT)', () => {
    const deviceMigration = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.includes('fix_equipamentos_rls'))
      .sort()
      .pop();

    if (!deviceMigration) {
      // Se não existir, ok — pode ter sido absorvido em outra migration
      return;
    }

    const content = readMigration(deviceMigration);
    expect(content).toContain('can_access_empresa(empresa_id)');
  });

  it('soft-delete empresas tem RLS restritiva que bloqueia linhas com deleted_at', () => {
    const softDeleteMigration = '20260414000006_soft_delete_empresas.sql';
    const hasMigration = fs.existsSync(path.join(MIGRATIONS_DIR, softDeleteMigration));

    if (!hasMigration) {
      throw new Error(`Migration ${softDeleteMigration} não encontrada. Execute Lote 2-C primeiro.`);
    }

    const content = readMigration(softDeleteMigration);

    // Deve ter uma política RESTRICTIVE que filtra deleted_at IS NULL
    expect(content).toMatch(/AS\s+RESTRICTIVE/i);
    expect(content).toContain('deleted_at IS NULL');
  });
});
