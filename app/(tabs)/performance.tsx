import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklySummaries } from '@/hooks/useWeeklySummary';
import { useUser, useDailyXPEvents } from '@/hooks/useUser';
import { useTasksForWeek, useAllTasks } from '@/hooks/useTasks';
import { useAllGoals } from '@/hooks/useGoals';
import { useMilestones } from '@/hooks/useMilestones';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { formatXP, clamp, getWeekStart, dayIndexToLabel, CAT_COLORS } from '@/lib/utils';
import { RANKS, getRankById, getNextRank, TRACK_COLORS } from '@/constants/ranks';
import { CATEGORIES } from '@/constants/xp';
import { XPBar } from '@/components/home/XPBar';
import { RankBadge } from '@/components/rank/RankBadge';
import { Rank } from '@/types';

const PERF_CATS = ['all', ...CATEGORIES.map((c) => c.value)] as const;
type PerfCat = typeof PERF_CATS[number];

function PercentBar({ value, color = '#5B5EF4' }: { value: number; color?: string }) {
  return (
    <View className="h-2 bg-surface-raised rounded-full overflow-hidden flex-1">
      <View style={{ width: `${clamp(value, 0, 100)}%`, backgroundColor: color }} className="h-full rounded-full" />
    </View>
  );
}

function SummaryRow({ week }: { week: any }) {
  const tasksRate = week.tasks_set > 0 ? (week.tasks_completed / week.tasks_set) * 100 : 0;
  const goalsRate = week.goals_set > 0 ? (week.goals_completed / week.goals_set) * 100 : 0;

  return (
    <View className="bg-surface-overlay border border-border rounded-xl p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-text-primary font-semibold text-sm">
          {format(parseISO(week.week_start), 'MMM d, yyyy')}
        </Text>
        <View className="flex-row items-center gap-2">
          {week.perfect_week && (
            <View className="bg-warning/20 border border-warning/40 px-2 py-0.5 rounded-full">
              <Text className="text-warning text-xs font-medium">Perfect</Text>
            </View>
          )}
          <Text className="text-xp text-sm font-semibold">+{week.xp_earned} XP</Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          <Text className="text-text-muted text-xs w-12">Tasks</Text>
          <PercentBar value={tasksRate} />
          <Text className="text-text-secondary text-xs w-16 text-right">
            {week.tasks_completed}/{week.tasks_set}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-text-muted text-xs w-12">Goals</Text>
          <PercentBar value={goalsRate} color="#22C55E" />
          <Text className="text-text-secondary text-xs w-16 text-right">
            {week.goals_completed}/{week.goals_set}
          </Text>
        </View>
      </View>
    </View>
  );
}

function RankRow({ rank, currentRankId }: { rank: Rank; currentRankId: number }) {
  const isCurrent = rank.id === currentRankId;
  const isAchieved = rank.id < currentRankId;
  const color = TRACK_COLORS[rank.track];
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
        borderRadius: 14, borderWidth: isCurrent ? 1.5 : 1,
        borderLeftWidth: isCurrent ? 3 : 1,
        borderLeftColor: isCurrent ? color : '#252535',
        borderColor: isCurrent ? color + '66' : '#252535',
        backgroundColor: isCurrent ? '#1e1a3a' : isAchieved ? '#13131e' : '#0e0e18',
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: (isAchieved || isCurrent) ? color + '20' : '#1a1a22', borderWidth: 1, borderColor: (isAchieved || isCurrent) ? color + '55' : '#252535', alignItems: 'center', justifyContent: 'center' }}>
        {isAchieved
          ? <Ionicons name="checkmark" size={14} color={color} />
          : <Text style={{ color: isCurrent ? color : '#44445A', fontSize: 11, fontWeight: '700' }}>{rank.id}</Text>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: isCurrent ? color : isAchieved ? color + 'BB' : '#8888AA', fontWeight: '600', fontSize: 13 }}>
          {rank.title}{isCurrent ? '  ← you' : ''}
        </Text>
        <Text style={{ color: '#44445A', fontSize: 11, marginTop: 2 }}>{formatXP(rank.min_xp)} XP · {rank.qualifying_days} days</Text>
      </View>
      {isCurrent && (
        <View style={{ backgroundColor: color + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color, fontSize: 11, fontWeight: '600' }}>Current</Text>
        </View>
      )}
    </View>
  );
}

const XP_SOURCE_LABELS: Record<string, string> = {
  small_task: 'Task',
  big_task: 'Task',
  major_goal: 'Goal',
  milestone: 'Milestone',
  habit: 'Habit',
  streak_bonus: 'Streak',
  daily_clear: 'Daily clear',
};

export default function PerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { data: summaries = [], isLoading, refetch } = useWeeklySummaries(12);
  const { data: user, isLoading: userLoading } = useUser();
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  const [mainView, setMainView] = useState<'performance' | 'ranks' | 'badges'>('performance');
  const statsView = useUIStore((s) => s.statsView);
  const setStatsView = useUIStore((s) => s.setStatsView);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [catFilter, setCatFilter] = useState<PerfCat>('all');

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['user', session?.user.id] });
    }, [session?.user.id]),
  );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dayWeekStart = getWeekStart(parseISO(selectedDate));
  const { data: dayTasks = [] } = useTasksForWeek(dayWeekStart);
  const { data: allTasks = [] } = useAllTasks();
  const { data: allGoals = [] } = useAllGoals();
  const { data: allMilestones = [] } = useMilestones();
  const { data: xpEvents = [] } = useDailyXPEvents(selectedDate);

  const jsDay = parseISO(selectedDate).getDay();
  const dayLabel = dayIndexToLabel(jsDay === 0 ? 6 : jsDay - 1);
  const tasksForDay = dayTasks.filter((t) => {
    const rt = t.recurrence_type ?? 'none';
    if (rt === 'daily') return true;
    if (rt === 'weekly') return t.scheduled_day === dayLabel;
    if (rt === 'custom') return t.recurrence_days?.includes(dayLabel) ?? false;
    return t.scheduled_day === dayLabel;
  });
  const filteredTasksForDay = catFilter === 'all'
    ? tasksForDay
    : tasksForDay.filter((t) => (t.goal?.category ?? 'other') === catFilter);
  const completedForDay = filteredTasksForDay.filter((t) =>
    t.recurrence_type !== 'none'
      ? (t.completed_dates?.includes(selectedDate) ?? false)
      : t.is_completed
  ).length;
  const isRecurringSourceId = (sourceId: string) => /_\d{4}-\d{2}-\d{2}$/.test(sourceId);
  const extractTaskId = (sourceId: string) =>
    isRecurringSourceId(sourceId) ? sourceId.replace(/_\d{4}-\d{2}-\d{2}$/, '') : sourceId;

  const goalById = React.useMemo(
    () => Object.fromEntries(allGoals.map((g) => [g.id, g])),
    [allGoals],
  );
  const milestoneById = React.useMemo(
    () => Object.fromEntries(allMilestones.map((m) => [m.id, m])),
    [allMilestones],
  );
  const taskById = React.useMemo(
    () => Object.fromEntries([...dayTasks].map((t) => [t.id, t])),
    [dayTasks],
  );
  const allTasksById = React.useMemo(
    () => Object.fromEntries(allTasks.map((t) => [t.id, t])),
    [allTasks],
  );

  const filteredXpEvents = catFilter === 'all'
    ? xpEvents
    : xpEvents.filter((e) => {
        if (e.source_type === 'small_task' || e.source_type === 'big_task' || e.source_type === 'habit' || e.source_type === 'streak_bonus') {
          const taskId = extractTaskId(e.source_id);
          const task = taskById[taskId];
          if (task) return task.goal?.category === catFilter;
          const goalId = allTasksById[taskId]?.goal_id;
          return goalId ? goalById[goalId]?.category === catFilter : false;
        }
        if (e.source_type === 'major_goal') {
          return goalById[e.source_id]?.category === catFilter;
        }
        if (e.source_type === 'milestone') {
          return milestoneById[e.source_id]?.category === catFilter;
        }
        return false;
      });
  const dailyXP = filteredXpEvents.reduce((sum, e) => sum + e.xp_amount, 0);

  const getEventLabel = (sourceType: string, sourceId: string): string => {
    if (sourceType === 'small_task' || sourceType === 'big_task') {
      const taskId = extractTaskId(sourceId);
      const isHabit = isRecurringSourceId(sourceId);
      return taskById[taskId]?.title
        ?? allTasks.find((t) => t.id === taskId)?.title
        ?? (isHabit ? 'Habit' : 'Task');
    }
    if (sourceType === 'major_goal') {
      return goalById[sourceId]?.title ?? 'Goal';
    }
    if (sourceType === 'milestone') {
      return milestoneById[sourceId]?.title ?? 'Milestone';
    }
    return XP_SOURCE_LABELS[sourceType] ?? sourceType;
  };

  const totalXPEarned = summaries.reduce((acc, s) => acc + s.xp_earned, 0);
  const avgCompletion =
    summaries.length > 0
      ? summaries.reduce(
          (acc, s) => acc + (s.tasks_set > 0 ? s.tasks_completed / s.tasks_set : 0),
          0
        ) / summaries.length
      : 0;
  const perfectWeeks = summaries.filter((s) => s.perfect_week).length;

  const currentRank = user ? getRankById(user.rank_id) : getRankById(1);
  const nextRank = getNextRank(currentRank.id);
  const rankColor = TRACK_COLORS[currentRank.track];
  const rankTracks = [
    { key: 'starter', label: 'Starter Track', ranks: RANKS.filter((r) => r.track === 'starter') },
    { key: 'specialist', label: 'Specialist Track', ranks: RANKS.filter((r) => r.track === 'specialist') },
    { key: 'leader', label: 'Leader Track', ranks: RANKS.filter((r) => r.track === 'leader') },
    { key: 'prestige', label: 'Prestige', ranks: RANKS.filter((r) => r.track === 'prestige') },
  ];

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ color: '#E8E8F2', fontSize: 24, fontWeight: '800' }}>Stats</Text>
            <Text style={{ color: '#8888AA', fontSize: 13, marginTop: 2 }}>Performance & rank progression</Text>
          </View>
          {mainView === 'performance' && (
            <View style={{ flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 8, padding: 2 }}>
              {(['weekly', 'daily'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setStatsView(v)}
                  style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, backgroundColor: statsView === v ? '#2A2A32' : 'transparent' }}
                >
                  <Text style={{ color: statsView === v ? '#E8E8F0' : '#55556A', fontSize: 12, fontWeight: '600' }}>
                    {v === 'weekly' ? 'Weekly' : 'Daily'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {/* Main toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: '#13131e', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#252535' }}>
          {(['performance', 'ranks', 'badges'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setMainView(v)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, backgroundColor: mainView === v ? '#252535' : 'transparent' }}
            >
              <Text style={{ color: mainView === v ? '#E8E8F2' : '#44445A', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                {v === 'performance' ? 'Performance' : v === 'ranks' ? 'Ranks' : 'Badges'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {mainView === 'performance' && statsView === 'daily' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' }}
          style={{ flexShrink: 0, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#252535' }}
        >
          {PERF_CATS.map((cat) => {
            const on = catFilter === cat;
            const col = cat === 'all' ? '#5B5EF4' : (CAT_COLORS[cat] ?? '#6B7280');
            const count = cat === 'all'
              ? tasksForDay.length
              : tasksForDay.filter((t) => (t.goal?.category ?? 'other') === cat).length;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCatFilter(cat)}
                style={{
                  flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
                  backgroundColor: on ? col : '#13131e',
                  borderWidth: 1, borderColor: on ? col : '#252535',
                }}
              >
                {cat !== 'all' && (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? '#fff' : col }} />
                )}
                <Text style={{ fontSize: 11, fontWeight: '600', color: on ? '#fff' : '#55556A', textTransform: 'capitalize' }}>
                  {cat}
                </Text>
                {count > 0 && (
                  <View style={{ backgroundColor: on ? 'rgba(255,255,255,0.25)' : col + '30', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' }}>
                    <Text style={{ color: on ? '#fff' : col, fontSize: 9, fontWeight: '700' }}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {(isLoading || userLoading) && summaries.length === 0 && !user && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5B5EF4" />
        </View>
      )}
      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        style={{ display: (isLoading || userLoading) && summaries.length === 0 && !user ? 'none' : 'flex' }}
        refreshControl={
          <RefreshControl refreshing={isLoading || userLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {mainView === 'badges' ? (
          <>
            <Text style={{ color: '#8888AA', fontSize: 12, textAlign: 'center' }}>
              Earn badges by hitting milestones in XP, tasks, and consistency.
            </Text>
            {([
              { icon: 'checkmark-circle', color: '#22C55E', title: 'First Mission', desc: 'Complete your first task', unlocked: (user?.xp_total ?? 0) > 0, progress: null },
              { icon: 'flash', color: '#5B5EF4', title: 'Momentum', desc: 'Earn 100 XP total', unlocked: (user?.xp_total ?? 0) >= 100, progress: `${user?.xp_total ?? 0} / 100 XP` },
              { icon: 'calendar', color: '#3B82F6', title: 'Consistent', desc: 'Get 7 qualifying days', unlocked: (user?.qualifying_days_total ?? 0) >= 7, progress: `${user?.qualifying_days_total ?? 0} / 7 days` },
              { icon: 'trophy', color: '#F59E0B', title: 'Perfect Week', desc: 'Complete a perfect week', unlocked: perfectWeeks >= 1, progress: `${perfectWeeks} / 1 weeks` },
              { icon: 'star', color: '#A855F7', title: 'XP Hunter', desc: 'Earn 500 XP total', unlocked: (user?.xp_total ?? 0) >= 500, progress: `${user?.xp_total ?? 0} / 500 XP` },
              { icon: 'flame', color: '#EF4444', title: 'On Fire', desc: '30 qualifying days', unlocked: (user?.qualifying_days_total ?? 0) >= 30, progress: `${user?.qualifying_days_total ?? 0} / 30 days` },
              { icon: 'ribbon', color: '#10B981', title: 'Specialist', desc: 'Reach Rank 10', unlocked: (user?.rank_id ?? 1) >= 10, progress: `Rank ${user?.rank_id ?? 1} / 10` },
              { icon: 'skull', color: '#8B5CF6', title: 'Legend', desc: 'Reach Rank 25 (Prestige)', unlocked: (user?.rank_id ?? 1) >= 25, progress: `Rank ${user?.rank_id ?? 1} / 25` },
            ] as const).map((badge) => (
              <TouchableOpacity
                key={badge.title}
                onPress={() => Alert.alert(badge.title, `${badge.desc}.\n\nStatus: ${badge.unlocked ? '✅ Earned' : '🔒 Locked — keep going!'}`)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: badge.unlocked ? '#13131e' : '#0e0e18',
                  borderWidth: 1, borderColor: badge.unlocked ? badge.color + '44' : '#252535',
                  borderRadius: 16, padding: 14,
                  opacity: badge.unlocked ? 1 : 0.5,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: badge.unlocked ? badge.color + '20' : '#1a1a22', borderWidth: 1.5, borderColor: badge.unlocked ? badge.color + '66' : '#252535', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={badge.icon as any} size={20} color={badge.unlocked ? badge.color : '#44445A'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: badge.unlocked ? '#E8E8F2' : '#55556A', fontWeight: '700', fontSize: 14 }}>{badge.title}</Text>
                  <Text style={{ color: '#44445A', fontSize: 12, marginTop: 2 }}>{badge.desc}</Text>
                  {!badge.unlocked && badge.progress && (
                    <Text style={{ color: '#5B5EF4', fontSize: 11, fontWeight: '600', marginTop: 3 }}>{badge.progress}</Text>
                  )}
                </View>
                {badge.unlocked && (
                  <View style={{ backgroundColor: badge.color + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: badge.color, fontSize: 10, fontWeight: '700' }}>Earned</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        ) : mainView === 'ranks' ? (
          <>
            {/* Rank hero card */}
            <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#252535' }}>
              <LinearGradient
                colors={['#1a1a2e', '#222228']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, gap: 20 }}
              >
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <RankBadge rank={currentRank} size="lg" showTrack />
                </View>
                <View style={{ width: '100%' }}>
                  <XPBar currentXP={user?.xp_total ?? 0} currentRank={currentRank} />
                </View>
                <View style={{ flexDirection: 'row', gap: 0 }}>
                  <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 22 }}>{formatXP(user?.xp_total ?? 0)}</Text>
                    <Text style={{ color: '#55556A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total XP</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: '#2A2A32', marginHorizontal: 8 }} />
                  <TouchableOpacity
                    style={{ flex: 1, alignItems: 'center', gap: 4 }}
                    onPress={() => Alert.alert('Qualifying Days', 'Days where you hit your Daily XP target. These count toward rank progression — each rank requires a minimum number of qualifying days in addition to total XP.')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#E8E8F2', fontWeight: '700', fontSize: 22 }}>{user?.qualifying_days_total ?? 0}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={{ color: '#55556A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qual. Days</Text>
                      <Ionicons name="information-circle-outline" size={11} color="#44445A" />
                    </View>
                  </TouchableOpacity>
                  {nextRank && (
                    <>
                      <View style={{ width: 1, backgroundColor: '#2A2A32', marginHorizontal: 8 }} />
                      <TouchableOpacity
                        style={{ flex: 1, alignItems: 'center', gap: 4 }}
                        onPress={() => Alert.alert('Days to Next Rank', `Qualifying days still needed to reach ${nextRank.title}. Hit your daily XP target each day to earn qualifying days and climb ranks.`)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: rankColor, fontWeight: '700', fontSize: 22 }}>
                          {Math.max(0, nextRank.qualifying_days - (user?.qualifying_days_total ?? 0))}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ color: '#55556A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Days to {nextRank.title}
                          </Text>
                          <Ionicons name="information-circle-outline" size={11} color="#44445A" />
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Rank ladder by track */}
            {rankTracks.map((track) => (
              <View key={track.key} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TRACK_COLORS[track.key as keyof typeof TRACK_COLORS] }} />
                  <Text style={{ color: '#8888AA', fontWeight: '600', fontSize: 13 }}>{track.label}</Text>
                </View>
                <View style={{ gap: 6 }}>
                  {track.ranks.map((rank) => (
                    <RankRow key={rank.id} rank={rank} currentRankId={currentRank.id} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : statsView === 'daily' ? (
          <>
            {/* Date navigator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color="#8888A0" />
              </TouchableOpacity>
              <Text className="text-text-primary font-semibold text-base">
                {format(parseISO(selectedDate), 'EEEE, MMM d')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedDate < todayStr)
                    setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ opacity: selectedDate >= todayStr ? 0.3 : 1 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#8888A0" />
              </TouchableOpacity>
            </View>

            {/* Daily stat cards */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2"
                onPress={() => Alert.alert('Tasks Done', 'Tasks completed today out of those scheduled. Includes habits and one-off tasks. Use the category filter above to drill into a specific life area.')}
                activeOpacity={0.8}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#5B5EF4' + '20' }} className="items-center justify-center">
                  <Ionicons name="checkbox-outline" size={14} color="#5B5EF4" />
                </View>
                <Text className="text-text-primary font-bold text-2xl">{completedForDay}/{filteredTasksForDay.length}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text className="text-text-muted text-xs">Tasks done</Text>
                  <Ionicons name="information-circle-outline" size={11} color="#44445A" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2"
                onPress={() => Alert.alert('XP Earned', 'Total XP earned from all completions today — tasks, habits, goals, and streak bonuses. Hit your daily target to earn a qualifying day.')}
                activeOpacity={0.8}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#A855F7' + '20' }} className="items-center justify-center">
                  <Ionicons name="star" size={14} color="#A855F7" />
                </View>
                <Text className="text-xp font-bold text-2xl">{dailyXP > 0 ? `+${dailyXP}` : '0'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text className="text-text-muted text-xs">XP earned</Text>
                  <Ionicons name="information-circle-outline" size={11} color="#44445A" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            {filteredTasksForDay.length > 0 && (
              <View className="bg-surface-overlay border border-border rounded-xl p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-muted text-xs font-medium">Completion</Text>
                  <Text className="text-text-secondary text-xs">
                    {filteredTasksForDay.length > 0 ? Math.round((completedForDay / filteredTasksForDay.length) * 100) : 0}%
                  </Text>
                </View>
                <PercentBar value={filteredTasksForDay.length > 0 ? (completedForDay / filteredTasksForDay.length) * 100 : 0} />
              </View>
            )}

            {/* Activity / history */}
            <Text className="text-text-secondary text-sm font-medium">Completed</Text>
            {filteredXpEvents.length === 0 ? (
              <View className="items-center py-8 gap-2">
                <Ionicons name="checkmark-circle-outline" size={40} color="#2A2A32" />
                <Text className="text-text-muted text-sm text-center">Nothing completed yet this day</Text>
              </View>
            ) : (
              filteredXpEvents.map((e) => {
                const isGoal = e.source_type === 'major_goal';
                const isMilestone = e.source_type === 'milestone';
                const isHabit = isRecurringSourceId(e.source_id);
                const iconName = isMilestone ? 'trophy' : isGoal ? 'flag' : isHabit ? 'repeat' : 'checkmark-circle';
                const iconColor = isMilestone ? '#8B5CF6' : isGoal ? '#22C55E' : isHabit ? '#F59E0B' : '#5B5EF4';
                const label = getEventLabel(e.source_type, e.source_id);
                return (
                  <View key={e.id} style={{ backgroundColor: '#1A1A22', borderWidth: 1, borderColor: '#2A2A32', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: iconColor + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ionicons name={iconName as any} size={14} color={iconColor} />
                    </View>
                    <Text style={{ color: '#C8C8E0', fontSize: 14, flex: 1, marginLeft: 10 }} numberOfLines={1}>{label}</Text>
                    <Text style={{ color: '#A0A3FF', fontSize: 13, fontWeight: '700', marginLeft: 8 }}>+{e.xp_amount} XP</Text>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
        {/* Overview stats */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2"
            onPress={() => Alert.alert('Qualifying Days', 'Days where you hit your Daily XP target. These count toward rank progression — each rank requires a minimum number of qualifying days in addition to total XP.')}
            activeOpacity={0.8}
          >
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#3B82F6' + '20' }} className="items-center justify-center">
              <Ionicons name="calendar-outline" size={14} color="#3B82F6" />
            </View>
            <Text className="text-text-primary font-bold text-2xl">
              {user?.qualifying_days_total ?? 0}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text className="text-text-muted text-xs">Qualifying days</Text>
              <Ionicons name="information-circle-outline" size={11} color="#44445A" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2"
            onPress={() => Alert.alert('Total XP', 'Lifetime XP earned across all tasks, habits, and goals. Used alongside qualifying days to determine your rank.')}
            activeOpacity={0.8}
          >
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#A855F7' + '20' }} className="items-center justify-center">
              <Ionicons name="star" size={14} color="#A855F7" />
            </View>
            <Text className="text-xp font-bold text-2xl">{formatXP(user?.xp_total ?? 0)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text className="text-text-muted text-xs">Total XP</Text>
              <Ionicons name="information-circle-outline" size={11} color="#44445A" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2"
            onPress={() => Alert.alert('Avg Completion', 'Your average weekly task completion rate across the last 12 weeks. Aim for 80%+ to stay on track with your goals.')}
            activeOpacity={0.8}
          >
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#22C55E' + '20' }} className="items-center justify-center">
              <Ionicons name="checkmark-circle-outline" size={14} color="#22C55E" />
            </View>
            <Text className="text-success font-bold text-2xl">
              {Math.round(avgCompletion * 100)}%
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text className="text-text-muted text-xs">Avg completion</Text>
              <Ionicons name="information-circle-outline" size={11} color="#44445A" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2"
            onPress={() => Alert.alert('Perfect Week', 'A week where you hit your Daily XP target every single day (Mon–Sun). Earns a bonus badge and shows on your history.')}
            activeOpacity={0.8}
          >
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F59E0B' + '20' }} className="items-center justify-center">
              <Ionicons name="trophy-outline" size={14} color="#F59E0B" />
            </View>
            <Text className="text-warning font-bold text-2xl">{perfectWeeks}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text className="text-text-muted text-xs">Perfect weeks</Text>
              <Ionicons name="information-circle-outline" size={11} color="#44445A" />
            </View>
          </TouchableOpacity>
        </View>

        <Text className="text-text-secondary text-sm font-medium">Weekly history</Text>

        {summaries.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Ionicons name="bar-chart-outline" size={48} color="#2A2A32" />
            <Text className="text-text-muted text-base text-center">
              No weekly data yet.{'\n'}Complete a week to see your stats.
            </Text>
          </View>
        ) : (
          summaries.map((s) => <SummaryRow key={s.id} week={s} />)
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
