import { create } from 'zustand';
import { getWeekStart } from '@/lib/utils';

interface RankUp { from: number; to: number; }

interface UIState {
  selectedWeekStart: string;
  setSelectedWeekStart: (date: string) => void;

  statsView: 'weekly' | 'daily';
  setStatsView: (v: 'weekly' | 'daily') => void;

  plannerView: 'week' | 'day';
  setPlannerView: (v: 'week' | 'day') => void;

  // Generic XP toast (habits etc.)
  xpAnimationPending: number;
  triggerXPAnimation: (xp: number) => void;
  clearXPAnimation: () => void;

  // Task completion
  taskCompletePending: { xp: number } | null;
  triggerTaskComplete: (xp: number) => void;
  clearTaskComplete: () => void;

  // Goal completion
  goalCompletePending: { xp: number } | null;
  triggerGoalComplete: (xp: number) => void;
  clearGoalComplete: () => void;

  // Milestone completion
  milestoneCompletePending: { xp: number } | null;
  triggerMilestoneComplete: (xp: number) => void;
  clearMilestoneComplete: () => void;

  // Rank up
  rankUpPending: RankUp | null;
  triggerRankUp: (from: number, to: number) => void;
  clearRankUp: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedWeekStart: getWeekStart(),
  setSelectedWeekStart: (date) => set({ selectedWeekStart: date }),

  statsView: 'daily',
  setStatsView: (v) => set({ statsView: v }),

  plannerView: 'day',
  setPlannerView: (v) => set({ plannerView: v }),

  xpAnimationPending: 0,
  triggerXPAnimation: (xp) => set({ xpAnimationPending: xp }),
  clearXPAnimation: () => set({ xpAnimationPending: 0 }),

  taskCompletePending: null,
  triggerTaskComplete: (xp) => set({ taskCompletePending: { xp } }),
  clearTaskComplete: () => set({ taskCompletePending: null }),

  goalCompletePending: null,
  triggerGoalComplete: (xp) => set({ goalCompletePending: { xp } }),
  clearGoalComplete: () => set({ goalCompletePending: null }),

  milestoneCompletePending: null,
  triggerMilestoneComplete: (xp) => set({ milestoneCompletePending: { xp } }),
  clearMilestoneComplete: () => set({ milestoneCompletePending: null }),

  rankUpPending: null,
  triggerRankUp: (from, to) => set({ rankUpPending: { from, to } }),
  clearRankUp: () => set({ rankUpPending: null }),
}));
