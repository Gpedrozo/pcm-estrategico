begin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
begin
  return event;
exception
  when others then
    return event;
end;
$$;

do $$
begin
  begin
    grant execute on function public.custom_access_token_hook(jsonb) to postgres, anon, authenticated, service_role;
  exception when others then
    null;
  end;

  begin
    grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
  exception when others then
    null;
  end;
end $$;

commit;
