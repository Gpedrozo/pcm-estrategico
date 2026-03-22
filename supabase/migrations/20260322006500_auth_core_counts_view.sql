create or replace function public.auth_core_counts()
returns table (
  users_count bigint,
  identities_count bigint,
  sessions_count bigint,
  refresh_tokens_count bigint,
  instances_count bigint,
  count_error text
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_users bigint := null;
  v_identities bigint := null;
  v_sessions bigint := null;
  v_refresh bigint := null;
  v_instances bigint := null;
  v_err text := null;
begin
  begin execute 'select count(*) from auth.users' into v_users; exception when others then v_err := coalesce(v_err,'') || 'users:' || SQLERRM || '; '; end;
  begin execute 'select count(*) from auth.identities' into v_identities; exception when others then v_err := coalesce(v_err,'') || 'identities:' || SQLERRM || '; '; end;
  begin execute 'select count(*) from auth.sessions' into v_sessions; exception when others then v_err := coalesce(v_err,'') || 'sessions:' || SQLERRM || '; '; end;
  begin execute 'select count(*) from auth.refresh_tokens' into v_refresh; exception when others then v_err := coalesce(v_err,'') || 'refresh_tokens:' || SQLERRM || '; '; end;
  begin execute 'select count(*) from auth.instances' into v_instances; exception when others then v_err := coalesce(v_err,'') || 'instances:' || SQLERRM || '; '; end;

  users_count := v_users;
  identities_count := v_identities;
  sessions_count := v_sessions;
  refresh_tokens_count := v_refresh;
  instances_count := v_instances;
  count_error := nullif(v_err, '');
  return next;
end;
$$;

create or replace view public.auth_core_counts_v as
select * from public.auth_core_counts();

grant execute on function public.auth_core_counts() to anon, authenticated, service_role;
grant select on public.auth_core_counts_v to anon, authenticated, service_role;
