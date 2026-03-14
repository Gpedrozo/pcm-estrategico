-- P0 Secure RLS baseline for critical multi-tenant tables.

create or replace function public.can_access_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role in ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
      )
      or exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.empresa_id = p_empresa_id
      )
    );
$$;

revoke execute on function public.can_access_empresa(uuid) from public;
grant execute on function public.can_access_empresa(uuid) to authenticated;

do $$
declare
  rec record;
begin
  for rec in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'empresas',
        'dados_empresa',
        'empresa_config',
        'ordens_servico',
        'execucoes_os',
        'execucoes_os_pausas',
        'materiais',
        'materiais_os',
        'contratos'
      )
  loop
    execute format('drop policy if exists %I on public.%I', rec.policyname, rec.tablename);
  end loop;
end $$;

alter table if exists public.empresas enable row level security;
alter table if exists public.dados_empresa enable row level security;
alter table if exists public.empresa_config enable row level security;
alter table if exists public.ordens_servico enable row level security;
alter table if exists public.execucoes_os enable row level security;
alter table if exists public.execucoes_os_pausas enable row level security;
alter table if exists public.materiais enable row level security;
alter table if exists public.materiais_os enable row level security;
alter table if exists public.contratos enable row level security;

create policy empresas_select_tenant_strict
on public.empresas
for select
to authenticated
using (public.can_access_empresa(id));

create policy empresas_insert_tenant_strict
on public.empresas
for insert
to authenticated
with check (public.can_access_empresa(id));

create policy empresas_update_tenant_strict
on public.empresas
for update
to authenticated
using (public.can_access_empresa(id))
with check (public.can_access_empresa(id));

create policy dados_empresa_crud_tenant_strict
on public.dados_empresa
for all
to authenticated
using (public.can_access_empresa(empresa_id))
with check (public.can_access_empresa(empresa_id));

create policy empresa_config_crud_tenant_strict
on public.empresa_config
for all
to authenticated
using (public.can_access_empresa(empresa_id))
with check (public.can_access_empresa(empresa_id));

create policy ordens_servico_crud_tenant_strict
on public.ordens_servico
for all
to authenticated
using (public.can_access_empresa(empresa_id))
with check (public.can_access_empresa(empresa_id));

create policy execucoes_os_crud_tenant_strict
on public.execucoes_os
for all
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = execucoes_os.os_id
      and public.can_access_empresa(os.empresa_id)
  )
)
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = execucoes_os.os_id
      and public.can_access_empresa(os.empresa_id)
  )
);

create policy execucoes_os_pausas_crud_tenant_strict
on public.execucoes_os_pausas
for all
to authenticated
using (public.can_access_empresa(empresa_id))
with check (public.can_access_empresa(empresa_id));

create policy materiais_crud_tenant_strict
on public.materiais
for all
to authenticated
using (public.can_access_empresa(empresa_id))
with check (public.can_access_empresa(empresa_id));

create policy materiais_os_crud_tenant_strict
on public.materiais_os
for all
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = materiais_os.os_id
      and public.can_access_empresa(os.empresa_id)
  )
)
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = materiais_os.os_id
      and public.can_access_empresa(os.empresa_id)
  )
);

create policy contratos_crud_tenant_strict
on public.contratos
for all
to authenticated
using (public.can_access_empresa(empresa_id))
with check (public.can_access_empresa(empresa_id));