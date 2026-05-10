import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { WeeklySummary } from '@/types';

export function useWeeklySummaries(limit = 8) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['weekly_summaries', session?.user.id, limit],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('week_start', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as WeeklySummary[];
    },
    enabled: !!session,
  });
}

export function useCurrentWeeklySummary(weekStart: string) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['weekly_summary', session?.user.id, weekStart],
    queryFn: async () => {
      if (!session) return null;
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklySummary | null;
    },
    enabled: !!session,
  });
}
