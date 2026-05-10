export type RankTrack = 'starter' | 'specialist' | 'leader' | 'prestige';

export interface Rank {
  id: number;
  code: string;
  title: string;
  min_xp: number;
  qualifying_days: number;
  badge_url: string | null;
  track: RankTrack;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  xp_total: number;
  qualifying_days_total: number;
  rank_id: number;
  daily_xp_target: DailyXPTarget;
  created_at: string;
}

export type GoalCategory = 'health' | 'work' | 'personal' | 'learning' | 'finance' | 'other';
export type GoalStatus = 'active' | 'completed';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  week_start: string;
  status: GoalStatus;
  xp_awarded: boolean;
  created_at?: string;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  scheduled_day: DayOfWeek;
  due_date: string | null;
  is_completed: boolean;
  xp_awarded: boolean;
  created_at?: string;
  goal?: Goal;
}

export interface XPEvent {
  id: string;
  user_id: string;
  source_type: 'small_task' | 'big_task' | 'major_goal' | 'habit' | 'streak_bonus' | 'daily_clear';
  source_id: string;
  xp_amount: number;
  created_at: string;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;
  goals_set: number;
  goals_completed: number;
  tasks_set: number;
  tasks_completed: number;
  xp_earned: number;
  perfect_week: boolean;
}

export type DailyXPTarget = 'casual' | 'regular' | 'active' | 'hardcore';

export const DAILY_XP_TARGETS: Record<DailyXPTarget, number> = {
  casual: 20,
  regular: 50,
  active: 100,
  hardcore: 200,
};
