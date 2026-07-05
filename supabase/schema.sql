-- Recipe Box — Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
--
-- What it sets up:
--   * profiles: one row per user, tracks the Stripe subscription state.
--     Only the server (service role) can write it — users can read their own.
--   * recipes: per-user recipe storage, locked down with row-level security
--     so each user can only ever see and touch their own recipes.
--   * Free-tier limit: a database trigger blocks the 31st recipe unless the
--     user's yearly subscription is active. Enforced in the database itself,
--     so it cannot be bypassed from the browser.

-- ─── profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  plan text not null default 'free' check (plan in ('free', 'yearly')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: only the service role key (server) writes.

-- Auto-create a profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── recipes ─────────────────────────────────────────────────────────────────

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  category text not null default '',
  subtitle text not null default '',
  optional text not null default '',
  servings text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  "imageSrc" text not null default '',
  "imageKind" text not null default '',
  "photoBatchKey" text not null default '',
  "titleFromPhoto" boolean not null default false,
  "hiddenPages" jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id, created_at);

alter table public.recipes enable row level security;

drop policy if exists "Users read own recipes" on public.recipes;
create policy "Users read own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own recipes" on public.recipes;
create policy "Users insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own recipes" on public.recipes;
create policy "Users update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own recipes" on public.recipes;
create policy "Users delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- ─── free-tier limit (30 recipes) ────────────────────────────────────────────

create or replace function public.enforce_recipe_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_limit constant int := 30;
  recipe_count int;
  subscription_active boolean;
begin
  select count(*) into recipe_count
  from public.recipes
  where user_id = new.user_id;

  if recipe_count < free_limit then
    return new;
  end if;

  select (p.plan = 'yearly' and (p.plan_expires_at is null or p.plan_expires_at > now()))
    into subscription_active
  from public.profiles p
  where p.user_id = new.user_id;

  if coalesce(subscription_active, false) then
    return new;
  end if;

  raise exception 'FREE_LIMIT_REACHED: the free plan includes % recipes. Upgrade to add more.', free_limit;
end;
$$;

drop trigger if exists recipes_enforce_limit on public.recipes;
create trigger recipes_enforce_limit
  before insert on public.recipes
  for each row execute function public.enforce_recipe_limit();
