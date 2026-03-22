create or replace function public.auth_runtime_diagnostics()
returns table (
  has_auth_custom_hook boolean,
  has_public_custom_hook boolean,
  has_auth_config_table boolean,
  has_auth_hooks_table boolean,
  auth_config_hook_enabled_text text,
  auth_hooks_enabled_count integer,
  auth_hooks_access_error text
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_cfg_text text;
  v_hooks_count integer := null;
  v_hooks_err text := null;
begin
  has_auth_custom_hook := to_regprocedure('auth.custom_access_token_hook(jsonb)') is not null;
  has_public_custom_hook := to_regprocedure('public.custom_access_token_hook(jsonb)') is not null;
  has_auth_config_table := to_regclass('auth.config') is not null;
  has_auth_hooks_table := to_regclass('auth.hooks') is not null;

  v_cfg_text := null;
  if has_auth_config_table then
    begin
      execute 'select config::text from auth.config limit 1' into v_cfg_text;
    exception when others then
      v_cfg_text := null;
    end;
  end if;

  if has_auth_hooks_table then
    begin
      execute 'select count(*) from auth.hooks where enabled = true' into v_hooks_count;
    exception when others then
      v_hooks_count := null;
      v_hooks_err := SQLERRM;
    end;
  end if;

  auth_config_hook_enabled_text := v_cfg_text;
  auth_hooks_enabled_count := v_hooks_count;
  auth_hooks_access_error := v_hooks_err;

  return next;
end;
$$;

create or replace view public.auth_runtime_diagnostics_v as
select * from public.auth_runtime_diagnostics();

grant execute on function public.auth_runtime_diagnostics() to anon, authenticated, service_role;
grant select on public.auth_runtime_diagnostics_v to anon, authenticated, service_role;
