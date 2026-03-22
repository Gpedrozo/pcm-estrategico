begin;

do $$
begin
  begin
    execute 'alter role supabase_auth_admin bypassrls';
  exception when others then
    null;
  end;
end $$;

commit;
