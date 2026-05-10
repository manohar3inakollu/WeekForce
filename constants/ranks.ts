import { Rank } from '@/types';

export const RANKS: Rank[] = [
  { id: 1, code: '1', title: 'Beginner', min_xp: 0, qualifying_days: 1, badge_url: null, track: 'starter' },
  { id: 2, code: '2', title: 'Learner', min_xp: 450, qualifying_days: 14, badge_url: null, track: 'starter' },
  { id: 3, code: '3', title: 'Doer', min_xp: 1100, qualifying_days: 35, badge_url: null, track: 'starter' },
  { id: 4, code: '4', title: 'Builder', min_xp: 2000, qualifying_days: 60, badge_url: null, track: 'starter' },
  { id: 5, code: '5', title: 'Achiever', min_xp: 2750, qualifying_days: 90, badge_url: null, track: 'starter' },
  { id: 6, code: '6', title: 'Momentum', min_xp: 3650, qualifying_days: 120, badge_url: null, track: 'starter' },
  { id: 7, code: '7', title: 'Focused', min_xp: 4400, qualifying_days: 145, badge_url: null, track: 'starter' },
  { id: 8, code: '8', title: 'Driven', min_xp: 4950, qualifying_days: 163, badge_url: null, track: 'starter' },
  { id: 9, code: '9', title: 'Committed', min_xp: 9150, qualifying_days: 183, badge_url: null, track: 'starter' },
  { id: 10, code: '10', title: 'Sharpener', min_xp: 9150, qualifying_days: 210, badge_url: null, track: 'specialist' },
  { id: 11, code: '11', title: 'Tactician', min_xp: 12650, qualifying_days: 280, badge_url: null, track: 'specialist' },
  { id: 12, code: '12', title: 'Strategist', min_xp: 18000, qualifying_days: 370, badge_url: null, track: 'specialist' },
  { id: 13, code: '13', title: 'Expert', min_xp: 23750, qualifying_days: 490, badge_url: null, track: 'specialist' },
  { id: 14, code: '14', title: 'Veteran', min_xp: 27400, qualifying_days: 548, badge_url: null, track: 'specialist' },
  { id: 15, code: '15', title: 'Pioneer', min_xp: 29000, qualifying_days: 580, badge_url: null, track: 'leader' },
  { id: 16, code: '16', title: 'Trailblazer', min_xp: 31500, qualifying_days: 630, badge_url: null, track: 'leader' },
  { id: 17, code: '17', title: 'Pathfinder', min_xp: 34500, qualifying_days: 690, badge_url: null, track: 'leader' },
  { id: 18, code: '18', title: 'Commander', min_xp: 38000, qualifying_days: 760, badge_url: null, track: 'leader' },
  { id: 19, code: '19', title: 'Executor', min_xp: 42500, qualifying_days: 840, badge_url: null, track: 'leader' },
  { id: 20, code: '20', title: 'Visionary', min_xp: 47500, qualifying_days: 930, badge_url: null, track: 'leader' },
  { id: 21, code: '21', title: 'Luminary', min_xp: 53000, qualifying_days: 1030, badge_url: null, track: 'leader' },
  { id: 22, code: '22', title: 'Titan', min_xp: 58500, qualifying_days: 1110, badge_url: null, track: 'leader' },
  { id: 23, code: '23', title: 'Apex', min_xp: 63500, qualifying_days: 1200, badge_url: null, track: 'leader' },
  { id: 24, code: '24', title: 'Legend', min_xp: 63900, qualifying_days: 1278, badge_url: null, track: 'leader' },
  { id: 25, code: '25', title: 'Immortal', min_xp: 91400, qualifying_days: 9999, badge_url: null, track: 'prestige' },
];

export const TRACK_COLORS = {
  starter: '#6B7280',
  specialist: '#3B82F6',
  leader: '#F59E0B',
  prestige: '#8B5CF6',
} as const;

export const TRACK_LABELS = {
  starter: 'Starter Track',
  specialist: 'Specialist Track',
  leader: 'Leader Track',
  prestige: 'Prestige',
} as const;

export function getRankById(id: number): Rank {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export function getRankForXP(xp: number, qualifyingDays: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (rank.id === 25) continue; // Immortal is special-cased
    if (xp >= rank.min_xp && qualifyingDays >= rank.qualifying_days) {
      current = rank;
    }
  }
  return current;
}

export function getNextRank(currentRankId: number): Rank | null {
  if (currentRankId >= 24) return null;
  return RANKS.find((r) => r.id === currentRankId + 1) ?? null;
}
