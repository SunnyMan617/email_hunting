alter table public.profiles alter column owner_id drop not null;
alter table public.contacts alter column owner_id drop not null;

grant select, insert, update, delete on public.profiles to anon;
grant select, insert, update, delete on public.contacts to anon;

drop policy if exists "Read own profiles" on public.profiles;
drop policy if exists "Create own profiles" on public.profiles;
drop policy if exists "Update own profiles" on public.profiles;
drop policy if exists "Delete own profiles" on public.profiles;
drop policy if exists "Read own contacts" on public.contacts;
drop policy if exists "Create own contacts" on public.contacts;
drop policy if exists "Update own contacts" on public.contacts;
drop policy if exists "Delete own contacts" on public.contacts;

create policy "Shared read profiles" on public.profiles for select to anon, authenticated using (true);
create policy "Shared create profiles" on public.profiles for insert to anon, authenticated with check (true);
create policy "Shared update profiles" on public.profiles for update to anon, authenticated using (true) with check (true);
create policy "Shared delete profiles" on public.profiles for delete to anon, authenticated using (true);
create policy "Shared read contacts" on public.contacts for select to anon, authenticated using (true);
create policy "Shared create contacts" on public.contacts for insert to anon, authenticated with check (true);
create policy "Shared update contacts" on public.contacts for update to anon, authenticated using (true) with check (true);
create policy "Shared delete contacts" on public.contacts for delete to anon, authenticated using (true);
