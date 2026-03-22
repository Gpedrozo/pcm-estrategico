begin;

do $$
begin
  begin
    grant usage on schema auth to supabase_auth_admin;
  exception when others then
    null;
  end;

  begin
    grant all privileges on all tables in schema auth to supabase_auth_admin;
  exception when others then
    null;
  end;

  begin
    grant all privileges on all sequences in schema auth to supabase_auth_admin;
  exception when others then
    null;
  end;

  begin
    grant all privileges on all routines in schema auth to supabase_auth_admin;
  exception when others then
    null;
  end;
end $$;

commit;
