-- WeekForce database schema
-- Run in Supabase SQL editor or via supabase db push

-- ─── ranks (static reference data) ───────────────────────────────────────────
create table if not exists public.ranks (
  id               int primary key,
  code             text not null,
  title            text not null,
  min_xp           int  not null default 0,
  qualifying_days  int  not null default 1,
  badge_url        text
);

insert into public.ranks (id, code, title, min_xp, qualifying_days) values
  (1,  '1',  'Beginner',    0,     1),
  (2,  '2',  'Learner',     450,   14),
  (3,  '3',  'Doer',        1100,  35),
  (4,  '4',  'Builder',     2000,  60),
  (5,  '5',  'Achiever',    2750,  90),
  (6,  '6',  'Momentum',    3650,  120),
  (7,  '7',  'Focused',     4400,  145),
  (8,  '8',  'Driven',      4950,  163),
  (9,  '9',  'Committed',   9150,  183),
  (10, '10', 'Sharpener',   9150,  210),
  (11, '11', 'Tactician',   12650, 280),
  (12, '12', 'Strategist',  18000, 370),
  (13, '13', 'Expert',      23750, 490),
  (14, '14', 'Veteran',     27400, 548),
  (15, '15', 'Pioneer',     29000, 580),
  (16, '16', 'Trailblazer', 31500, 630),
  (17, '17', 'Pathfinder',  34500, 690),
  (18, '18', 'Commander',   38000, 760),
  (19, '19', 'Executor',    42500, 840),
  (20, '20', 'Visionary',   47500, 930),
  (21, '21', 'Luminary',    53000, 1030),
  (22, '22', 'Titan',       58500, 1110),
  (23, '23', 'Apex',        63500, 1200),
  (24, '24', 'Legend',      63900, 1278),
  (25, '25', 'Immortal',    91400, 9999)
on conflict (id) do nothing;

-- ─── users ────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null unique,
  full_name             text not null default '',
  xp_total              int  not null default 0,
  qualifying_days_total int  not null default 0,
  rank_id               int  not null default 1 references public.ranks(id),
  daily_xp_target       text not null default 'regular'
                             check (daily_xp_target in ('casual','regular','active','hardcore')),
  created_at            timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "users_own" on public.users
  using (auth.uid() = id) with check (auth.uid() = id);

-- ─── goals ────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  description text,
  category    text not null default 'work'
                   check (category in ('health','work','personal','learning','finance','other')),
  week_start  date not null,
  status      text not null default 'active' check (status in ('active','completed')),
  xp_awarded  bool not null default false,
  created_at  timestamptz not null default now()
);

alter table public.goals enable row level security;
create policy "goals_own" on public.goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists goals_user_week on public.goals(user_id, week_start);

-- ─── tasks ────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  title         text not null,
  scheduled_day text not null check (scheduled_day in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  due_date      date,
  is_completed  bool not null default false,
  xp_awarded    bool not null default false,
  created_at    timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "tasks_own" on public.tasks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists tasks_user_due on public.tasks(user_id, due_date);
create index if not exists tasks_goal on public.tasks(goal_id);

-- ─── xp_events ────────────────────────────────────────────────────────────────
create table if not exists public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  source_type text not null check (
    source_type in ('small_task','big_task','major_goal','habit','streak_bonus','daily_clear')
  ),
  source_id   uuid not null,
  xp_amount   int  not null,
  created_at  timestamptz not null default now()
);

alter table public.xp_events enable row level security;
create policy "xp_events_own" on public.xp_events
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists xp_events_user on public.xp_events(user_id, created_at desc);

-- ─── weekly_summaries ─────────────────────────────────────────────────────────
create table if not exists public.weekly_summaries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  week_start       date not null,
  goals_set        int  not null default 0,
  goals_completed  int  not null default 0,
  tasks_set        int  not null default 0,
  tasks_completed  int  not null default 0,
  xp_earned        int  not null default 0,
  perfect_week     bool not null default false,
  unique (user_id, week_start)
);

alter table public.weekly_summaries enable row level security;
create policy "summaries_own" on public.weekly_summaries
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── RPC: increment_user_xp ───────────────────────────────────────────────────
create or replace function public.increment_user_xp(user_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
declare
  new_xp int;
  new_rank_id int;
  qualifying_days int;
begin
  update public.users
    set xp_total = xp_total + amount
  where id = user_id
  returning xp_total, qualifying_days_total
  into new_xp, qualifying_days;

  -- Promote rank if thresholds are met (ranks 1-24 only)
  select id into new_rank_id
  from public.ranks
  where id < 25
    and min_xp <= new_xp
    and qualifying_days <= qualifying_days
  order by id desc
  limit 1;

  if new_rank_id is not null then
    update public.users set rank_id = new_rank_id where id = user_id;
  end if;
end;
$$;

-- ─── RPC: record_qualifying_day ───────────────────────────────────────────────
create or replace function public.record_qualifying_day(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
    set qualifying_days_total = qualifying_days_total + 1
  where id = p_user_id;
end;
$$;

-- ─── Trigger: auto-create user profile on auth signup ─────────────────────────
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
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
