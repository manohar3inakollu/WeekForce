import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Goal, GoalCategory, Difficulty } from '@/types';
import { GOAL_XP_BY_DIFFICULTY } from '@/constants/xp';
import { awardXP, revokeXP } from '@/lib/xp';
import { useUIStore } from '@/store/ui';
import { format, addDays, parseISO } from 'date-fns';

export function useGoals(weekStart: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['goals', session?.user.id, weekStart],
    queryFn: async () => {
      if (!session) return [];
      const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .or(
          `and(start_date.lte.${weekEnd},due_date.gte.${weekStart}),` +
          `and(start_date.lte.${weekEnd},due_date.is.null)`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!session,
    staleTime: 60_000,
  });
}

export function useGoal(id: string) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('user_id', session!.user.id)
        .single();
      if (error) throw error;
      return data as Goal;
    },
    enabled: !!id && !!session,
    staleTime: 60_000,
  });
}

export function useGoalsByMilestone(milestoneId: string) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['goals', 'milestone', milestoneId],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('milestone_id', milestoneId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!milestoneId && !!session,
    staleTime: 60_000,
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
      start_date?: string | null;
      due_date?: string | null;
      difficulty?: Difficulty;
      milestone_id?: string | null;
    }) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('goals')
        .insert({
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          start_date: input.start_date ?? null,
          due_date: input.due_date ?? null,
          difficulty: input.difficulty ?? 'medium',
          milestone_id: input.milestone_id ?? null,
          user_id: session.user.id,
          status: 'active',
          xp_awarded: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      if (data.milestone_id) {
        qc.invalidateQueries({ queryKey: ['goals', 'milestone', data.milestone_id] });
      }
    },
  });
}

export function useUpdateGoalStatus() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerGoalComplete = useUIStore((s) => s.triggerGoalComplete);
  const triggerRankUp = useUIStore((s) => s.triggerRankUp);

  return useMutation({
    mutationFn: async ({ goal, status }: { goal: Goal; status: 'active' | 'completed' }) => {
      const isDone = status === 'completed';

      const { error } = await supabase
        .from('goals')
        .update({ status })
        .eq('id', goal.id)
        .eq('user_id', session!.user.id);
      if (error) throw error;

      // Award XP only if not already awarded (prevents double-award on complete→uncomplete→complete)
      if (isDone && !goal.xp_awarded) {
        const xpAmount = GOAL_XP_BY_DIFFICULTY[goal.difficulty ?? 'medium'];
        const result = await awardXP(session!.user.id, 'major_goal', goal.id, xpAmount);
        // Only flag xp_awarded after the RPC succeeds — prevents orphaned flag on network failure
        await supabase.from('goals').update({ xp_awarded: true }).eq('id', goal.id).eq('user_id', session!.user.id);
        return { goalId: goal.id, xpAmount, oldRank: result.oldRank, newRank: result.newRank };
      }

      // Revoke XP when marking as incomplete
      if (!isDone && goal.xp_awarded) {
        await revokeXP(session!.user.id, goal.id);
        await supabase.from('goals').update({ xp_awarded: false }).eq('user_id', session!.user.id).eq('id', goal.id);
      }

      return { goalId: goal.id, xpAmount: 0, oldRank: 1, newRank: 1 };
    },
    onSuccess: ({ goalId, xpAmount, oldRank, newRank }) => {
      if (xpAmount > 0) triggerGoalComplete(xpAmount);
      if (newRank > oldRank) triggerRankUp(oldRank, newRank);
      qc.invalidateQueries({ queryKey: ['goals'] });
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
        .eq('user_id', session!.user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['goal', data.id] });
      qc.invalidateQueries({ queryKey: ['goals', 'milestone'] });
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
        .from('goals').select('id, title, category').eq('user_id', session.user.id);
      if (error) throw error;
      return data as { id: string; title: string; category: string }[];
    },
    enabled: !!session,
    staleTime: 60_000,
  });
}

export function useAllGoalsFull() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['goals', session?.user.id, 'all-full'],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Goal[];
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
      if (!session) throw new Error('Not authenticated');

      // Revoke XP for all completed tasks under this goal before deleting
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, xp_awarded, recurrence_type, completed_dates')
        .eq('goal_id', id)
        .eq('user_id', session.user.id);

      if (tasks) {
        for (const task of tasks) {
          if (task.recurrence_type !== 'none' && task.completed_dates?.length) {
            await Promise.all(
              (task.completed_dates as string[]).map((d) =>
                revokeXP(session.user.id, `${task.id}_${d}`).catch(() => {})
              )
            );
          } else if (task.xp_awarded) {
            await revokeXP(session.user.id, task.id).catch(() => {});
          }
        }
      }

      // Revoke XP for the goal itself
      const { data: goal } = await supabase
        .from('goals')
        .select('xp_awarded')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (goal?.xp_awarded) {
        await revokeXP(session.user.id, id).catch(() => {});
      }

      await supabase.from('tasks').delete().eq('goal_id', id).eq('user_id', session.user.id);
      const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', session.user.id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}
