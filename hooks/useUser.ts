import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { User } from '@/types';

function sessionFallbackUser(session: Session): User {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    full_name: meta.full_name ?? meta.name ?? '',
    xp_total: 0,
    qualifying_days_total: 0,
    rank_id: 1,
    daily_xp_target: 'regular',
    created_at: new Date().toISOString(),
  };
}

export function useUser() {
  const session = useAuthStore((s) => s.session);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['user', session?.user.id],
    queryFn: async () => {
      if (!session) return null;
      const meta = session.user.user_metadata ?? {};
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error?.code === 'PGRST116') {
        // User row missing — DB trigger didn't fire (common with OAuth). Create it.
        const full_name = meta.full_name ?? meta.name ?? '';
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .upsert({
            id: session.user.id,
            email: session.user.email ?? '',
            full_name,
          }, { onConflict: 'id' })
          .select()
          .single();
        if (insertError) {
          // Upsert failed (e.g. email uniqueness conflict from a deleted+recreated account).
          // Fall back to a minimal user object built from the session so the UI is usable.
          console.error('[useUser] upsert failed:', insertError.message, insertError.code);
          const fallback = sessionFallbackUser(session);
          setUser(fallback);
          return fallback;
        }
        data = newUser;
        error = null;
      } else if (error) {
        // Any other DB error — use session metadata as fallback so the UI stays functional.
        console.error('[useUser] fetch failed:', error.message, error.code);
        const fallback = sessionFallbackUser(session);
        setUser(fallback);
        return fallback;
      }

      // Backfill full_name when the DB trigger created the row with an empty name.
      // Happens with Google OAuth: trigger reads 'full_name' but Google sends 'name'.
      if (data && !data.full_name) {
        const full_name = meta.full_name ?? meta.name ?? '';
        if (full_name) {
          const { data: updated } = await supabase
            .from('users')
            .update({ full_name })
            .eq('id', session.user.id)
            .select()
            .single();
          if (updated) data = updated;
        }
      }

      setUser(data as User);
      return data as User;
    },
    enabled: !!session,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
    },
  });
}

export function useDailyXPEvents(dateStr: string) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['xp_events', session?.user.id, dateStr],
    queryFn: async () => {
      if (!session) return [];
      // Use a ±24 h window to account for timezone differences between the
      // device and the Supabase server, then filter client-side to the exact
      // local date. For non-today dates the window is the same size — no need
      // to fetch 3 days of events as the old ±48 h end did.
      const localMidnight = new Date(`${dateStr}T00:00:00`);
      const windowStart = new Date(localMidnight.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const windowEnd   = new Date(localMidnight.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('created_at', windowStart)
        .lte('created_at', windowEnd)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const all = (data ?? []) as { id: string; source_type: string; source_id: string; xp_amount: number; created_at: string }[];
      return all.filter((e) => {
        const d = new Date(e.created_at);
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return local === dateStr;
      });
    },
    enabled: !!session,
    staleTime: 30_000,
  });
}

export function useDeleteAccount() {
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Not authenticated');
      const uid = session.user.id;
      await supabase.from('xp_events').delete().eq('user_id', uid);
      await supabase.from('tasks').delete().eq('user_id', uid);
      await supabase.from('goals').delete().eq('user_id', uid);
      await supabase.from('milestones').delete().eq('user_id', uid);
      await supabase.from('weekly_summaries').delete().eq('user_id', uid);
      await supabase.from('users').delete().eq('id', uid);
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      clear();
    },
  });
}

export function useResetProgress() {
  const qc = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Not authenticated');
      const uid = session.user.id;
      await supabase.from('users').update({ xp_total: 0, qualifying_days_total: 0, rank_id: 1 }).eq('id', uid);
      await supabase.from('xp_events').delete().eq('user_id', uid);
      await supabase.from('tasks').update({ is_completed: false, xp_awarded: false, status: 'pending', completed_dates: [] }).eq('user_id', uid);
      await supabase.from('goals').update({ status: 'active', xp_awarded: false }).eq('user_id', uid);
      await supabase.from('milestones').update({ status: 'active', xp_awarded: false }).eq('user_id', uid);
      await supabase.from('weekly_summaries').delete().eq('user_id', uid);
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
