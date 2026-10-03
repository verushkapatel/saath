-- Lets a signed-in user remove their own account and everything stored for it.
-- The vault row goes with the user because of the cascade in 0001.

create or replace function public.saath_delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.saath_vault where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.saath_delete_account() from public, anon;
grant execute on function public.saath_delete_account() to authenticated;
