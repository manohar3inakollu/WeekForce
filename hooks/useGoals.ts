import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Goal, GoalCategory } from '@/types';

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

export function useCreateGoal() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category: GoalCategory;
      week_start: string;
    }) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...input,
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
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id, data.week_start] });
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
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id] });
    },
  });
}
