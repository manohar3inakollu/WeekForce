import { supabase } from '@/lib/supabase';

export interface XPResult {
  newXP: number;
  oldRank: number;
  newRank: number;
}

/** Atomically award XP via server-side RPC. Handles race conditions and qualifying_days. */
export async function awardXP(
  userId: string,
  sourceType: string,
  sourceId: string,
  xpAmount: number,
): Promise<XPResult> {
  const { data, error } = await supabase.rpc('award_xp', {
    p_user_id:     userId,
    p_source_type: sourceType,
    p_source_id:   sourceId,
    p_xp_amount:   xpAmount,
  });
  if (error) throw error;
  return { newXP: data.new_xp, oldRank: data.old_rank, newRank: data.new_rank };
}

/** Atomically revoke XP via server-side RPC. */
export async function revokeXP(userId: string, sourceId: string): Promise<XPResult> {
  const { data, error } = await supabase.rpc('revoke_xp', {
    p_user_id:   userId,
    p_source_id: sourceId,
  });
  if (error) throw error;
  return { newXP: data.new_xp, oldRank: data.old_rank, newRank: data.new_rank };
}
