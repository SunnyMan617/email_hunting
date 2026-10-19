create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  country text not null default '' check (length(country) <= 100),
  profile_link text not null default '' check (profile_link = '' or profile_link ~ '^https?://'),
  additional_link text not null default '' check (additional_link = '' or additional_link ~ '^https?://'),
  status text not null default 'Active' check (status in ('Active', 'Pending', 'Inactive')),
  my_contact boolean not null default false,
  note text not null default '' check (length(note) <= 5000),
  created_at timestamptz not null default now()
);

create index profiles_owner_created_idx on public.profiles(owner_id, created_at desc, id);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;
create policy "Read own profiles" on public.profiles for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Create own profiles" on public.profiles for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own profiles" on public.profiles for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own profiles" on public.profiles for delete to authenticated using ((select auth.uid()) = owner_id);
