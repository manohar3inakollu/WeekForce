import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Task, DayOfWeek } from '@/types';
import { XP_AWARDS } from '@/constants/xp';
import { useUIStore } from '@/store/ui';

export function useTasksForWeek(weekStart: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['tasks', session?.user.id, weekStart],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(*)')
        .eq('user_id', session.user.id)
        .gte('due_date', weekStart)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!session,
  });
}

export function useTasksForGoal(goalId: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['tasks', 'goal', goalId],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!session,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: {
      goal_id: string;
      title: string;
      scheduled_day: DayOfWeek;
      due_date?: string;
    }) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          user_id: session.user.id,
          is_completed: false,
          xp_awarded: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerXP = useUIStore((s) => s.triggerXPAnimation);

  return useMutation({
    mutationFn: async ({
      task,
      xpAmount,
    }: {
      task: Task;
      xpAmount: number;
    }) => {
      if (!session) throw new Error('Not authenticated');

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ is_completed: true, xp_awarded: true })
        .eq('id', task.id);
      if (taskError) throw taskError;

      const { error: xpError } = await supabase.from('xp_events').insert({
        user_id: session.user.id,
        source_type: 'small_task',
        source_id: task.id,
        xp_amount: xpAmount,
      });
      if (xpError) throw xpError;

      const { error: userError } = await supabase.rpc('increment_user_xp', {
        user_id: session.user.id,
        amount: xpAmount,
      });
      if (userError) throw userError;

      return { taskId: task.id, xpAmount };
    },
    onSuccess: ({ xpAmount }) => {
      triggerXP(xpAmount);
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
    },
  });
}

export function useUncompleteTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: false })
        .eq('id', taskId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', 'goal'] });
    },
  });
}
