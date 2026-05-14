-- Milestones: long-term life objectives that sit above weekly goals

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  description text,
  category    text not null default 'personal'
               check (category in ('health','work','personal','learning','finance','other')),
  due_date    date,
  status      text not null default 'active' check (status in ('active','completed')),
  difficulty  text not null default 'medium' check (difficulty in ('easy','medium','hard','epic')),
  created_at  timestamptz not null default now()
);

alter table public.milestones enable row level security;

create policy "milestones_own" on public.milestones
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists milestones_user on public.milestones(user_id, created_at desc);
