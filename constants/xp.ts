export const XP_AWARDS = {
  small_task: 10,
  big_task: 25,
  multi_day_task: 50,
  major_goal: 100,
  streak_7: 50,
  streak_30: 200,
  streak_365: 1000,
} as const;

export const TASK_XP_BY_DIFFICULTY = {
  easy: 5,
  medium: 10,
  hard: 25,
  epic: 50,
} as const;

export const GOAL_XP_BY_DIFFICULTY = {
  easy: 50,
  medium: 100,
  hard: 200,
  epic: 400,
} as const;

export const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy',   color: '#22C55E', xp: 5,   goalXp: 50  },
  { value: 'medium', label: 'Medium', color: '#F59E0B', xp: 10,  goalXp: 100 },
  { value: 'hard',   label: 'Hard',   color: '#EF4444', xp: 25,  goalXp: 200 },
  { value: 'epic',   label: 'Epic',   color: '#A855F7', xp: 50,  goalXp: 400 },
] as const;

export const CATEGORIES = [
  { value: 'health', label: 'Health', color: '#22C55E' },
  { value: 'work', label: 'Work', color: '#3B82F6' },
  { value: 'personal', label: 'Personal', color: '#F59E0B' },
  { value: 'learning', label: 'Learning', color: '#8B5CF6' },
  { value: 'finance', label: 'Finance', color: '#10B981' },
  { value: 'other', label: 'Other', color: '#6B7280' },
] as const;

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
