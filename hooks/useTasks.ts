import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Task, DayOfWeek, TaskPriority, TaskStatus, Difficulty, RecurrenceType } from '@/types';
import { TASK_XP_BY_DIFFICULTY } from '@/constants/xp';
import { awardXP, revokeXP } from '@/lib/xp';
import { useUIStore } from '@/store/ui';
import { scheduleHabitNotifications, cancelHabitNotifications } from '@/lib/notifications';

export function useTasksForWeek(weekStart: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['tasks', session?.user.id, weekStart],
    queryFn: async () => {
      if (!session) return [];
      const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(*)')
        .eq('user_id', session.user.id)
        .or(`and(due_date.gte.${weekStart},due_date.lte.${weekEnd}),recurrence_type.neq.none`)
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true, nullsFirst: false })
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
        .eq('user_id', session.user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!session && !!goalId,
    staleTime: 60_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: {
      goal_id?: string | null;
      title: string;
      scheduled_day: DayOfWeek;
      due_date?: string;
      start_time?: string | null;
      estimated_minutes?: number;
      priority?: TaskPriority;
      difficulty?: Difficulty;
      recurrence_type?: RecurrenceType;
      recurrence_days?: DayOfWeek[] | null;
    }) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          goal_id: input.goal_id ?? null,
          user_id: session.user.id,
          estimated_minutes: input.estimated_minutes ?? 30,
          priority: input.priority ?? 'medium',
          difficulty: input.difficulty ?? 'medium',
          recurrence_type: input.recurrence_type ?? 'none',
          recurrence_days: input.recurrence_days ?? null,
          status: 'pending',
          sort_order: 0,
          is_completed: false,
          xp_awarded: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      if (data.goal_id) {
        qc.invalidateQueries({ queryKey: ['tasks', 'goal', data.goal_id] });
      }
      if (data.recurrence_type !== 'none' && data.start_time) {
        scheduleHabitNotifications(
          data.id, data.title, data.start_time,
          data.recurrence_type, data.scheduled_day, data.recurrence_days,
        ).catch(() => {});
      }
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerTaskComplete = useUIStore((s) => s.triggerTaskComplete);
  const triggerRankUp = useUIStore((s) => s.triggerRankUp);

  return useMutation({
    mutationFn: async ({ task, status }: { task: Task; status: TaskStatus }) => {
      if (!session) throw new Error('Not authenticated');

      const isDone = status === 'done';

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status, is_completed: isDone })
        .eq('id', task.id)
        .eq('user_id', session.user.id);
      if (taskError) throw taskError;

      if (isDone && !task.xp_awarded) {
        const xpAmount = TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium'];
        const result = await awardXP(session.user.id, 'small_task', task.id, xpAmount);
        // Only set flag after RPC succeeds — prevents orphaned flag on network failure
        await supabase.from('tasks').update({ xp_awarded: true }).eq('id', task.id).eq('user_id', session.user.id);
        return { taskId: task.id, xpAmount, oldRank: result.oldRank, newRank: result.newRank };
      }

      return { taskId: task.id, xpAmount: 0, oldRank: 1, newRank: 1 };
    },
    onSuccess: ({ taskId, xpAmount, oldRank, newRank }) => {
      if (xpAmount > 0) triggerTaskComplete(xpAmount);
      if (newRank > oldRank) triggerRankUp(oldRank, newRank);
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}


export function useUncompleteTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: false, xp_awarded: false, status: 'pending' })
        .eq('id', taskId)
        .eq('user_id', session.user.id);
      if (error) throw error;

      const result = await revokeXP(session.user.id, taskId);

      return { taskId, ...result };
    },
    onSuccess: ({ taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}

export function useReorderTasks() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (reorderedTasks: Task[]) => {
      const { error } = await supabase
        .from('tasks')
        .upsert(
          reorderedTasks.map((task, index) => ({
            id: task.id,
            user_id: session!.user.id,
            sort_order: index,
          })),
          { onConflict: 'id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
    },
  });
}

export function useToggleRecurringTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerXP = useUIStore((s) => s.triggerXPAnimation);
  const triggerRankUp = useUIStore((s) => s.triggerRankUp);

  return useMutation({
    mutationFn: async ({ task, dateStr }: { task: Task; dateStr: string }) => {
      if (!session) throw new Error('Not authenticated');
      const sourceId = `${task.id}_${dateStr}`;

      // Check existing event using source_id composite key
      const { data: existingEvent } = await supabase
        .from('xp_events')
        .select('id')
        .eq('source_id', sourceId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existingEvent) {
        // UN-MARK: revoke XP and remove from completed_dates
        await revokeXP(session.user.id, sourceId);
        const newDates = (task.completed_dates ?? []).filter((d) => d !== dateStr);
        await supabase.from('tasks').update({ completed_dates: newDates }).eq('id', task.id).eq('user_id', session.user.id);
        return { taskId: task.id, xpAmount: 0, oldRank: 1, newRank: 1 };
      }

      // MARK DONE: award XP and add to completed_dates
      const xpAmount = TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium'];
      const result = await awardXP(session.user.id, 'small_task', sourceId, xpAmount);
      const newDates = [...(task.completed_dates ?? []), dateStr];
      await supabase.from('tasks').update({ completed_dates: newDates }).eq('id', task.id).eq('user_id', session.user.id);
      return { taskId: task.id, xpAmount, oldRank: result.oldRank, newRank: result.newRank };
    },
    onSuccess: ({ taskId, xpAmount, oldRank, newRank }) => {
      if (xpAmount > 0) triggerXP(xpAmount);
      if (newRank > oldRank) triggerRankUp(oldRank, newRank);
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}

export function useAllTasks() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['tasks', session?.user.id, 'all'],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('tasks').select('id, title, goal_id').eq('user_id', session.user.id);
      if (error) throw error;
      return data as { id: string; title: string; goal_id: string | null }[];
    },
    enabled: !!session,
    staleTime: 60_000,
  });
}

export function useAllTasksFull() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['tasks', session?.user.id, 'all-full'],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!session,
    staleTime: 60_000,
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', session!.user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id, 'all-full'] });
      qc.invalidateQueries({ queryKey: ['task', data.id] });
      qc.invalidateQueries({ queryKey: ['tasks', 'goal'] });
      if (data.recurrence_type !== 'none' && data.start_time) {
        scheduleHabitNotifications(
          data.id, data.title, data.start_time,
          data.recurrence_type, data.scheduled_day, data.recurrence_days,
        ).catch(() => {});
      } else {
        cancelHabitNotifications(data.id).catch(() => {});
      }
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!session) throw new Error('Not authenticated');

      // Revoke any XP awarded for this task before deleting
      const { data: task } = await supabase
        .from('tasks')
        .select('xp_awarded, recurrence_type, completed_dates')
        .eq('id', taskId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (task) {
        if (task.recurrence_type !== 'none' && task.completed_dates?.length) {
          await Promise.all(
            (task.completed_dates as string[]).map((d) =>
              revokeXP(session.user.id, `${taskId}_${d}`).catch(() => {})
            )
          );
        } else if (task.xp_awarded) {
          await revokeXP(session.user.id, taskId).catch(() => {});
        }
      }

      const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', session.user.id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      cancelHabitNotifications(taskId).catch(() => {});
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', 'goal'] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}
