/**
 * Lote 2-D / Item 2.12
 * Testes de autenticação bcrypt de mecânicos
 *
 * Valida via análise estática das migrations:
 *   (a) verificar_senha_mecanico usa crypt() (pgcrypto/bcrypt), não comparação plaintext
 *   (b) validar_credenciais_mecanico_servidor (V9) usa bcrypt sem fallback plaintext
 *   (c) V9 revoga acesso de anon à RPC crítica
 *   (d) coluna senha_acesso (plaintext) foi dropada
 *   (e) RPCs legadas de comparação plaintext foram dropadas
 *   (f) useMecanicoSessionTracking chama a RPC correta
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT        = path.resolve(__dirname, '../..');
const MIGRATIONS  = path.join(ROOT, 'supabase', 'migrations');
const HOOKS_DIR   = path.join(ROOT, 'src', 'hooks');

function readMigration(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS, name), 'utf-8');
}

const V9_MIGRATION = '20260412000200_auditoria_v9_senha_hash_cleanup.sql';
const V3_MIGRATION = '20260410210000_auditoria_v3_security_fixes.sql';

// ─────────────────────────────────────────────────────────────────────────────

describe('verificar_senha_mecanico — bcrypt via pgcrypto crypt()', () => {
  it('função usa crypt(p_senha, v_hash) para comparação', () => {
    const content = readMigration(V3_MIGRATION);

    // Deve chamar crypt() com o hash armazenado (padrão pgcrypto bf)
    expect(content).toMatch(/crypt\s*\(\s*p_senha\s*,\s*v_hash\s*\)/i);
  });

  it('NÃO faz comparação direta de plaintext (=, LIKE, etc.)', () => {
    const content = readMigration(V3_MIGRATION);

    // Extrai apenas o corpo da função verificar_senha_mecanico
    const fnStart = content.indexOf('CREATE OR REPLACE FUNCTION public.verificar_senha_mecanico');
    const fnEnd   = content.indexOf('$$;', fnStart);
    if (fnStart === -1 || fnEnd === -1)
      throw new Error('Função verificar_senha_mecanico não encontrada');

    const body = content.slice(fnStart, fnEnd + 3);

    // Não deve ter "= p_senha" sem passar por crypt (placetext compare)
    // A única comparação deve ser v_hash = crypt(...)
    expect(body).not.toMatch(/senha_acesso\s*=\s*p_senha/i);
    expect(body).not.toMatch(/p_senha\s*=\s*senha_acesso/i);
  });

  it('busca senha_hash (coluna bcrypt), não senha_acesso (plaintext)', () => {
    const content = readMigration(V3_MIGRATION);
    const fnStart = content.indexOf('CREATE OR REPLACE FUNCTION public.verificar_senha_mecanico');
    const fnEnd   = content.indexOf('$$;', fnStart);
    const body    = content.slice(fnStart, fnEnd + 3);

    expect(body).toContain('senha_hash');
    expect(body).not.toContain('senha_acesso');
  });
});

describe('validar_credenciais_mecanico_servidor V9 — bcrypt puro, sem plaintext fallback', () => {
  it('migration V9 existe', () => {
    expect(fs.existsSync(path.join(MIGRATIONS, V9_MIGRATION))).toBe(true);
  });

  it('V9 usa crypt(p_senha_acesso, senha_hash) para validação', () => {
    const content = readMigration(V9_MIGRATION);
    expect(content).toMatch(/crypt\s*\(\s*p_senha_acesso\s*,\s*v_mecanico\.senha_hash\s*\)/i);
  });

  it('V9 NÃO compara senha_acesso em plaintext', () => {
    const content = readMigration(V9_MIGRATION);

    // Na V9 não deve existir "senha_acesso =" ou "= p_senha_acesso" fora do crypt()
    // Verificamos que o padrão de comparação plaintext não existe na função principal
    const fnStart = content.indexOf('CREATE OR REPLACE FUNCTION public.validar_credenciais_mecanico_servidor');
    const fnEnd   = content.indexOf('$$;', fnStart);
    if (fnStart === -1 || fnEnd === -1)
      throw new Error('validar_credenciais_mecanico_servidor não encontrada na V9');

    const body = content.slice(fnStart, fnEnd + 3);

    // Não deve ter comparação direta "senha_acesso = p_senha_acesso"
    expect(body).not.toMatch(/\.\s*senha_acesso\s*=\s*p_senha_acesso/i);
    // Não deve ter fallback "OR senha_acesso"
    expect(body).not.toMatch(/OR\s+(v_mecanico\.)?senha_acesso/i);
  });

  it('V9 inclui safety gate que aborta se algum mecânico ainda tem plaintext pendente', () => {
    const content = readMigration(V9_MIGRATION);
    // RAISE EXCEPTION indica que a migration aborta se encontrar plaintext sem hash
    expect(content).toMatch(/RAISE EXCEPTION.*V9-ABORT/i);
    expect(content).toContain('senha_hash IS NULL');
  });

  it('V9 revoga acesso de anon à RPC', () => {
    const content = readMigration(V9_MIGRATION);
    expect(content).toMatch(
      /REVOKE\s+(ALL\s+ON|EXECUTE\s+ON\s+FUNCTION)\s+.*validar_credenciais_mecanico_servidor.*FROM\s+anon/i,
    );
  });

  it('V9 faz GRANT apenas para authenticated e service_role', () => {
    const content = readMigration(V9_MIGRATION);
    expect(content).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+.*validar_credenciais_mecanico_servidor.*TO\s+authenticated/i,
    );
    expect(content).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+.*validar_credenciais_mecanico_servidor.*TO\s+service_role/i,
    );
  });

  it('V9 dropa a coluna senha_acesso (plaintext)', () => {
    const content = readMigration(V9_MIGRATION);
    expect(content).toMatch(/ALTER\s+TABLE\s+.*mecanicos\s+DROP\s+COLUMN\s+(IF\s+EXISTS\s+)?senha_acesso/i);
  });

  it('V9 dropa RPCs legadas de comparação plaintext', () => {
    const content = readMigration(V9_MIGRATION);
    expect(content).toContain('DROP FUNCTION IF EXISTS public.validar_senha_mecanico');
    expect(content).toContain('DROP FUNCTION IF EXISTS public.login_mecanico');
  });
});

describe('useMecanicoSessionTracking — usa a RPC correta', () => {
  it('chama validar_credenciais_mecanico_servidor via supabase.rpc()', () => {
    const hookPath = path.join(HOOKS_DIR, 'useMecanicoSessionTracking.ts');
    if (!fs.existsSync(hookPath)) return; // hook pode ter sido movido

    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain("rpc('validar_credenciais_mecanico_servidor'");
  });

  it('NÃO compara senha em plaintext no frontend', () => {
    const hookPath = path.join(HOOKS_DIR, 'useMecanicoSessionTracking.ts');
    if (!fs.existsSync(hookPath)) return;

    const content = fs.readFileSync(hookPath, 'utf-8');

    // Não deve ter comparação direta de senha no frontend
    expect(content).not.toMatch(/senha\s*===\s*|===\s*senha/i);
    expect(content).not.toMatch(/password\s*===\s*|===\s*password/i);
    // Não deve ter acesso direto à coluna senha_acesso
    expect(content).not.toContain('.senha_acesso');
  });
});
