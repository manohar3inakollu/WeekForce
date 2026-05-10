import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { User } from '@/types';

export function useUser() {
  const session = useAuthStore((s) => s.session);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['user', session?.user.id],
    queryFn: async () => {
      if (!session) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
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
