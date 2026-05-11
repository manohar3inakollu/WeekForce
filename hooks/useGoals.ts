import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Goal, GoalCategory, Difficulty } from '@/types';
import { GOAL_XP_BY_DIFFICULTY } from '@/constants/xp';
import { useUIStore } from '@/store/ui';

export function useGoals(weekStart: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['goals', session?.user.id, weekStart],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('week_start', weekStart)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!session,
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Goal;
    },
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category: GoalCategory;
      week_start: string;
      due_date?: string | null;
      difficulty?: Difficulty;
    }) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...input,
          user_id: session.user.id,
          difficulty: input.difficulty ?? 'medium',
          status: 'active',
          xp_awarded: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id, data.week_start] });
    },
  });
}

export function useUpdateGoalStatus() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerXP = useUIStore((s) => s.triggerXPAnimation);

  return useMutation({
    mutationFn: async ({ goal, status }: { goal: Goal; status: 'active' | 'completed' }) => {
      const isDone = status === 'completed';
      const wasCompleted = goal.status === 'completed';

      const { error } = await supabase.from('goals').update({ status, xp_awarded: isDone }).eq('id', goal.id);
      if (error) throw error;

      if (isDone && !wasCompleted) {
        const xpAmount = GOAL_XP_BY_DIFFICULTY[goal.difficulty ?? 'medium'];
        await supabase.from('xp_events').insert({
          user_id: session!.user.id,
          source_type: 'major_goal',
          source_id: goal.id,
          xp_amount: xpAmount,
        });
        const { data: userData } = await supabase.from('users').select('xp_total').eq('id', session!.user.id).single();
        await supabase.from('users').update({ xp_total: (userData?.xp_total ?? 0) + xpAmount }).eq('id', session!.user.id);
        return { goalId: goal.id, xpAmount, weekStart: goal.week_start };
      }

      if (!isDone && wasCompleted) {
        const { data: xpEvent } = await supabase
          .from('xp_events').select('xp_amount').eq('source_id', goal.id).eq('user_id', session!.user.id).maybeSingle();
        if (xpEvent) {
          await supabase.from('xp_events').delete().eq('source_id', goal.id).eq('user_id', session!.user.id);
          const { data: userData } = await supabase.from('users').select('xp_total').eq('id', session!.user.id).single();
          await supabase.from('users')
            .update({ xp_total: Math.max(0, (userData?.xp_total ?? 0) - xpEvent.xp_amount) })
            .eq('id', session!.user.id);
        }
      }

      return { goalId: goal.id, xpAmount: 0, weekStart: goal.week_start };
    },
    onSuccess: ({ goalId, xpAmount, weekStart }) => {
      if (xpAmount > 0) triggerXP(xpAmount);
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id, weekStart] });
      qc.invalidateQueries({ queryKey: ['goal', goalId] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id, data.week_start] });
      qc.invalidateQueries({ queryKey: ['goal', data.id] });
    },
  });
}

export function useAllGoals() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['goals', session?.user.id, 'all'],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('goals').select('id, title').eq('user_id', session.user.id);
      if (error) throw error;
      return data as { id: string; title: string }[];
    },
    enabled: !!session,
    staleTime: 60_000,
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('tasks').delete().eq('goal_id', id);
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
    },
  });
}
