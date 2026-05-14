import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Milestone, GoalCategory, Difficulty } from '@/types';
import { MILESTONE_XP_BY_DIFFICULTY } from '@/constants/xp';
import { awardXP, revokeXP } from '@/lib/xp';
import { useUIStore } from '@/store/ui';

export function useMilestone(id: string) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['milestone', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('id', id)
        .eq('user_id', session!.user.id)
        .single();
      if (error) throw error;
      return data as Milestone;
    },
    enabled: !!id && !!session,
    staleTime: 60_000,
  });
}

export function useMilestones() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['milestones', session?.user.id],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!session,
    staleTime: 60_000,
  });
}

export function useCreateMilestone() {
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
    }) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('milestones')
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
      return data as Milestone;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', session?.user.id] });
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Milestone> }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .eq('user_id', session!.user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['milestones', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['milestone', data.id] });
    },
  });
}

export function useUpdateMilestoneStatus() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const triggerMilestoneComplete = useUIStore((s) => s.triggerMilestoneComplete);
  const triggerRankUp = useUIStore((s) => s.triggerRankUp);

  return useMutation({
    mutationFn: async ({ id, status, milestone }: { id: string; status: 'active' | 'completed'; milestone: Milestone }) => {
      const isDone = status === 'completed';

      const { error } = await supabase
        .from('milestones')
        .update({ status })
        .eq('id', id)
        .eq('user_id', session!.user.id);
      if (error) throw error;

      // Guard with xp_awarded flag to prevent double-award on complete→uncomplete→complete cycles
      if (isDone && !milestone.xp_awarded) {
        const xpAmount = MILESTONE_XP_BY_DIFFICULTY[milestone.difficulty ?? 'medium'];
        const result = await awardXP(session!.user.id, 'milestone', id, xpAmount);
        // Only set flag after RPC succeeds — prevents orphaned flag on network failure
        await supabase.from('milestones').update({ xp_awarded: true }).eq('id', id).eq('user_id', session!.user.id);
        return { xpAmount, oldRank: result.oldRank, newRank: result.newRank };
      }

      if (!isDone && milestone.xp_awarded) {
        await revokeXP(session!.user.id, id);
        await supabase.from('milestones').update({ xp_awarded: false }).eq('id', id).eq('user_id', session!.user.id);
      }

      return { xpAmount: 0, oldRank: 1, newRank: 1 };
    },
    onSuccess: ({ xpAmount, oldRank, newRank }, { id }) => {
      if (xpAmount > 0) triggerMilestoneComplete(xpAmount);
      if (newRank > oldRank) triggerRankUp(oldRank, newRank);
      qc.invalidateQueries({ queryKey: ['milestones', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['milestone', id] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!session) throw new Error('Not authenticated');

      const { data: milestone } = await supabase
        .from('milestones')
        .select('xp_awarded')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (milestone?.xp_awarded) {
        await revokeXP(session.user.id, id).catch(() => {});
      }

      const { error } = await supabase.from('milestones').delete().eq('id', id).eq('user_id', session.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['goals', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
    },
  });
}
