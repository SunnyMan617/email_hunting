create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null default '' check (email = '' or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telegram text not null default '' check (length(telegram) <= 80),
  whatsapp text not null default '' check (length(whatsapp) <= 80),
  discord text not null default '' check (length(discord) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
revoke all on public.contacts from anon;
grant select, insert, update, delete on public.contacts to authenticated;
drop policy if exists "Read own contacts" on public.contacts;
drop policy if exists "Create own contacts" on public.contacts;
drop policy if exists "Update own contacts" on public.contacts;
drop policy if exists "Delete own contacts" on public.contacts;
create policy "Read own contacts" on public.contacts for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Create own contacts" on public.contacts for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own contacts" on public.contacts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own contacts" on public.contacts for delete to authenticated using ((select auth.uid()) = owner_id);
create index if not exists contacts_owner_name_idx on public.contacts(owner_id, name, id);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles drop constraint if exists profiles_email_check;
alter table public.profiles add constraint profiles_email_check check (email = '' or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
alter table public.profiles add column if not exists updated_at timestamptz;
update public.profiles set updated_at = created_at where updated_at is null;
alter table public.profiles alter column updated_at set default now();
alter table public.profiles alter column updated_at set not null;
alter table public.profiles add column if not exists contact_id uuid references public.contacts(id) on delete set null;
create index if not exists profiles_contact_idx on public.profiles(contact_id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'profile_link'
  ) then
    alter table public.profiles rename column profile_link to link;
  end if;
end $$;

update public.profiles set status = case status
  when 'Active' then 'Found'
  when 'Pending' then 'Sent'
  when 'Inactive' then 'Failed'
  else status
end
where status in ('Active', 'Pending', 'Inactive');

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('Found', 'Sent', 'Responded', 'Interview', 'Failed', 'Succeeded'));
alter table public.profiles alter column status set default 'Found';
alter table public.profiles drop column if exists my_contact;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists contacts_touch_updated_at on public.contacts;
create trigger contacts_touch_updated_at before update on public.contacts
for each row execute function public.touch_updated_at();
revoke all on function public.touch_updated_at() from public, anon, authenticated;
