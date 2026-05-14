-- week_start on goals is redundant now that goals have start_date + due_date
drop index if exists public.goals_user_week;
alter table public.goals drop column if exists week_start;
