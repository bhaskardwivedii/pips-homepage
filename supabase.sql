-- Pip's homepage: live guestbook + shared hit counter
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

-- 1) Guestbook wishes
create table if not exists public.guestbook (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 24),
  message     text not null check (char_length(message) between 2 and 140),
  sticker     text not null default '🌙' check (char_length(sticker) <= 8),
  created_at  timestamptz not null default now()
);
alter table public.guestbook enable row level security;
drop policy if exists "anyone can read wishes" on public.guestbook;
create policy "anyone can read wishes" on public.guestbook for select using (true);
drop policy if exists "anyone can add a wish" on public.guestbook;
create policy "anyone can add a wish" on public.guestbook for insert with check (true);
-- (no update/delete policies: visitors can't edit or remove anyone's wish)

-- 2) Hit counter
create table if not exists public.counters (
  key    text primary key,
  value  bigint not null default 0
);
insert into public.counters (key, value) values ('visits', 0) on conflict (key) do nothing;
alter table public.counters enable row level security;
drop policy if exists "anyone can read counters" on public.counters;
create policy "anyone can read counters" on public.counters for select using (true);

-- Visitors can only bump the counter by exactly one, through this function.
create or replace function public.bump_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.counters set value = value + 1 where key = 'visits' returning value;
$$;
revoke all on function public.bump_visits() from public;
grant execute on function public.bump_visits() to anon, authenticated;
