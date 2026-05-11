import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Task, DayOfWeek, TaskPriority, TaskStatus, Difficulty, RecurrenceType } from '@/types';
import { TASK_XP_BY_DIFFICULTY } from '@/constants/xp';
import { useUIStore } from '@/store/ui';

export function useTasksForWeek(weekStart: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['tasks', session?.user.id, weekStart],
    queryFn: async () => {
      if (!session) return [];
      // Fetch tasks for this week AND any recurring tasks (recurrence_type != 'none')
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(*)')
        .eq('user_id', session.user.id)
        .or(`due_date.eq.${weekStart},recurrence_type.neq.none`)
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
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!session && !!goalId,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerXP = useUIStore((s) => s.triggerXPAnimation);

  return useMutation({
    mutationFn: async ({ task, status }: { task: Task; status: TaskStatus }) => {
      if (!session) throw new Error('Not authenticated');

      const isDone = status === 'done';
      const wasCompleted = task.is_completed;

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status, is_completed: isDone, xp_awarded: isDone })
        .eq('id', task.id);
      if (taskError) throw taskError;

      if (isDone && !wasCompleted) {
        const xpAmount = TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium'];
        await supabase.from('xp_events').insert({
          user_id: session.user.id,
          source_type: 'small_task',
          source_id: task.id,
          xp_amount: xpAmount,
        });
        const { data: userData } = await supabase
          .from('users')
          .select('xp_total')
          .eq('id', session.user.id)
          .single();
        await supabase
          .from('users')
          .update({ xp_total: (userData?.xp_total ?? 0) + xpAmount })
          .eq('id', session.user.id);
        return { taskId: task.id, xpAmount };
      }

      return { taskId: task.id, xpAmount: 0 };
    },
    onSuccess: ({ taskId, xpAmount }) => {
      if (xpAmount > 0) triggerXP(xpAmount);
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}

export function useCompleteTask() {
  const updateStatus = useUpdateTaskStatus();
  return {
    ...updateStatus,
    mutate: (args: { task: Task; xpAmount: number }) =>
      updateStatus.mutate({ task: args.task, status: 'done' }),
    mutateAsync: (args: { task: Task; xpAmount: number }) =>
      updateStatus.mutateAsync({ task: args.task, status: 'done' }),
    isPending: updateStatus.isPending,
  };
}

export function useUncompleteTask() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!session) throw new Error('Not authenticated');

      const { data: xpEvent } = await supabase
        .from('xp_events')
        .select('xp_amount')
        .eq('source_id', taskId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (xpEvent) {
        await supabase.from('xp_events').delete().eq('source_id', taskId).eq('user_id', session.user.id);
        const { data: userData } = await supabase.from('users').select('xp_total').eq('id', session.user.id).single();
        await supabase.from('users')
          .update({ xp_total: Math.max(0, (userData?.xp_total ?? 0) - xpEvent.xp_amount) })
          .eq('id', session.user.id);
      }

      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: false, xp_awarded: false, status: 'pending' })
        .eq('id', taskId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
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
      await Promise.all(
        reorderedTasks.map((task, index) =>
          supabase.from('tasks').update({ sort_order: index }).eq('id', task.id)
        )
      );
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

  return useMutation({
    mutationFn: async ({ task, dateStr }: { task: Task; dateStr: string }) => {
      const sourceId = `${task.id}_${dateStr}`;

      // Use xp_events as source of truth — works even if completed_dates column is missing
      const { data: existingEvent } = await supabase
        .from('xp_events')
        .select('id, xp_amount')
        .eq('source_id', sourceId)
        .eq('user_id', session!.user.id)
        .maybeSingle();

      if (existingEvent) {
        // UN-MARK: delete XP event and deduct from total
        await supabase.from('xp_events').delete().eq('source_id', sourceId).eq('user_id', session!.user.id);
        const { data: userData } = await supabase.from('users').select('xp_total').eq('id', session!.user.id).single();
        await supabase.from('users')
          .update({ xp_total: Math.max(0, (userData?.xp_total ?? 0) - existingEvent.xp_amount) })
          .eq('id', session!.user.id);
        // Best-effort: also remove from completed_dates array if column exists
        const newDates = (task.completed_dates ?? []).filter((d) => d !== dateStr);
        await supabase.from('tasks').update({ completed_dates: newDates }).eq('id', task.id);
        return { taskId: task.id, xpAmount: 0 };
      }

      // MARK DONE: insert XP event and add to total
      const xpAmount = TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium'];
      const { error: insertError } = await supabase.from('xp_events').insert({
        user_id: session!.user.id,
        source_type: 'small_task',
        source_id: sourceId,
        xp_amount: xpAmount,
      });
      if (insertError) throw insertError;

      const { data: userData } = await supabase.from('users').select('xp_total').eq('id', session!.user.id).single();
      await supabase.from('users')
        .update({ xp_total: (userData?.xp_total ?? 0) + xpAmount })
        .eq('id', session!.user.id);
      // Best-effort: also record in completed_dates array if column exists
      const newDates = [...(task.completed_dates ?? []), dateStr];
      await supabase.from('tasks').update({ completed_dates: newDates }).eq('id', task.id);
      return { taskId: task.id, xpAmount };
    },
    onSuccess: ({ taskId, xpAmount }) => {
      if (xpAmount > 0) triggerXP(xpAmount);
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
        .from('tasks').select('id, title').eq('user_id', session.user.id);
      if (error) throw error;
      return data as { id: string; title: string }[];
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
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['task', data.id] });
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
