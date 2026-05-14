import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  onboarded: boolean | null; // null = not yet loaded from storage
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setInitialized: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  onboarded: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),
  setOnboarded: (onboarded) => set({ onboarded }),
  clear: () => set({ session: null, user: null, onboarded: false }),
}));
