-- Link goals to milestones (optional)
alter table public.goals
  add column if not exists milestone_id uuid references public.milestones(id) on delete set null;

create index if not exists goals_milestone on public.goals(milestone_id);
