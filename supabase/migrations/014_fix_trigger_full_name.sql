-- Fix handle_new_user trigger to read 'name' as fallback for OAuth providers
-- (Google OAuth sends the display name under 'name', not 'full_name')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing users whose full_name was left empty by the old trigger
update public.users u
set full_name = coalesce(
  nullif(au.raw_user_meta_data->>'full_name', ''),
  nullif(au.raw_user_meta_data->>'name', ''),
  ''
)
from auth.users au
where au.id = u.id
  and u.full_name = ''
  and coalesce(
    nullif(au.raw_user_meta_data->>'full_name', ''),
    nullif(au.raw_user_meta_data->>'name', '')
  ) is not null;
