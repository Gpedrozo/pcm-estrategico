BEGIN;

-- Hotfix compatível com Supabase gerenciado:
-- tenta desabilitar RLS em tabelas auth, mas não falha se faltar permissão.
DO $$
BEGIN
  BEGIN
    ALTER TABLE auth.audit_log_entries DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.flow_state DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.identities DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.instances DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.mfa_amr_claims DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.mfa_factors DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.one_time_tokens DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.saml_providers DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.saml_relay_states DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.schema_migrations DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.sessions DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.sso_domains DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.sso_providers DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL;
  END;
END;
$$;

COMMIT;
