import { create } from 'zustand';

interface UIState {
  selectedWeekStart: string;
  setSelectedWeekStart: (date: string) => void;
  xpAnimationPending: number;
  triggerXPAnimation: (xp: number) => void;
  clearXPAnimation: () => void;
}

import { getWeekStart } from '@/lib/utils';

export const useUIStore = create<UIState>((set) => ({
  selectedWeekStart: getWeekStart(),
  setSelectedWeekStart: (date) => set({ selectedWeekStart: date }),
  xpAnimationPending: 0,
  triggerXPAnimation: (xp) => set({ xpAnimationPending: xp }),
  clearXPAnimation: () => set({ xpAnimationPending: 0 }),
}));
