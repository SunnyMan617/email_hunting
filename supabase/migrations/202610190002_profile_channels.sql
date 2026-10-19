alter table public.profiles add column if not exists telegram text not null default '';
alter table public.profiles add column if not exists whatsapp text not null default '';
alter table public.profiles add column if not exists discord text not null default '';
alter table public.profiles drop constraint if exists profiles_telegram_check;
alter table public.profiles drop constraint if exists profiles_whatsapp_check;
alter table public.profiles drop constraint if exists profiles_discord_check;
alter table public.profiles add constraint profiles_telegram_check check (length(telegram) <= 80);
alter table public.profiles add constraint profiles_whatsapp_check check (length(whatsapp) <= 80);
alter table public.profiles add constraint profiles_discord_check check (length(discord) <= 80);
