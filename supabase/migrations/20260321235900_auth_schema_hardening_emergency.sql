do $$
begin
  begin
    update auth.config
    set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('custom_access_token_hook_enabled', false);
  exception when others then
    null;
  end;

  begin
    update auth.hooks
    set enabled = false
    where hook_name ilike '%access_token%';
  exception when others then
    null;
  end;
end $$;