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

export const MILESTONE_XP_BY_DIFFICULTY = {
  easy: 500,
  medium: 1000,
  hard: 2000,
  epic: 5000,
} as const;

export const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy',   color: '#22C55E', xp: 5,   goalXp: 50,   milestoneXp: 500  },
  { value: 'medium', label: 'Medium', color: '#F59E0B', xp: 10,  goalXp: 100,  milestoneXp: 1000 },
  { value: 'hard',   label: 'Hard',   color: '#EF4444', xp: 25,  goalXp: 200,  milestoneXp: 2000 },
  { value: 'epic',   label: 'Epic',   color: '#A855F7', xp: 50,  goalXp: 400,  milestoneXp: 5000 },
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


export const RANK_NAMES: Record<number, string> = {
  1: 'Beginner', 2: 'Learner', 3: 'Doer', 4: 'Builder', 5: 'Achiever',
  6: 'Momentum', 7: 'Focused', 8: 'Driven', 9: 'Committed', 10: 'Sharpener',
  11: 'Tactician', 12: 'Strategist', 13: 'Expert', 14: 'Veteran', 15: 'Pioneer',
  16: 'Trailblazer', 17: 'Pathfinder', 18: 'Commander', 19: 'Executor', 20: 'Visionary',
  21: 'Luminary', 22: 'Titan', 23: 'Apex', 24: 'Legend', 25: 'Immortal',
};
