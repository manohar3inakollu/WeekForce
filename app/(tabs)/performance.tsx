import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklySummaries } from '@/hooks/useWeeklySummary';
import { useUser, useDailyXPEvents } from '@/hooks/useUser';
import { useTasksForWeek, useAllTasks } from '@/hooks/useTasks';
import { useAllGoals } from '@/hooks/useGoals';
import { useAuthStore } from '@/store/auth';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { formatXP, clamp, getWeekStart, dayIndexToLabel } from '@/lib/utils';

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

const XP_SOURCE_LABELS: Record<string, string> = {
  small_task: 'Task',
  big_task: 'Task',
  major_goal: 'Goal',
  habit: 'Habit',
  streak_bonus: 'Streak',
  daily_clear: 'Daily clear',
};

export default function PerformanceScreen() {
  const { data: summaries = [], isLoading, refetch } = useWeeklySummaries(12);
  const { data: user } = useUser();
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  const [statsView, setStatsView] = useState<'weekly' | 'daily'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Refetch xp_events and tasks every time this tab is focused so completions
  // from other tabs (Habits, Planner) show up immediately without manual refresh.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['xp_events', session?.user.id] });
      qc.invalidateQueries({ queryKey: ['tasks', session?.user.id] });
    }, [session?.user.id]),
  );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dayWeekStart = getWeekStart(parseISO(selectedDate));
  const { data: dayTasks = [] } = useTasksForWeek(dayWeekStart);
  const { data: allTasks = [] } = useAllTasks();
  const { data: allGoals = [] } = useAllGoals();
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
  const completedForDay = tasksForDay.filter((t) =>
    t.recurrence_type !== 'none'
      ? (t.completed_dates?.includes(selectedDate) ?? false)
      : t.is_completed
  ).length;
  const dailyXP = xpEvents.reduce((sum, e) => sum + e.xp_amount, 0);

  const getEventLabel = (sourceType: string, sourceId: string): string => {
    if (sourceType === 'small_task' || sourceType === 'big_task') {
      // Recurring tasks have sourceId = "uuid_YYYY-MM-DD"; UUIDs are 36 chars
      const taskId = sourceId.length > 36 ? sourceId.slice(0, 36) : sourceId;
      return allTasks.find((t) => t.id === taskId)?.title
        ?? dayTasks.find((t) => t.id === taskId)?.title
        ?? 'Task';
    }
    if (sourceType === 'major_goal') {
      return allGoals.find((g) => g.id === sourceId)?.title ?? 'Goal';
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

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text-primary text-2xl font-bold">Performance</Text>
            <Text className="text-text-secondary text-sm">Your progress over time</Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 8, padding: 2 }}>
            {(['weekly', 'daily'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setStatsView(v)}
                style={{
                  paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6,
                  backgroundColor: statsView === v ? '#2A2A32' : 'transparent',
                }}
              >
                <Text style={{ color: statsView === v ? '#E8E8F0' : '#55556A', fontSize: 12, fontWeight: '600' }}>
                  {v === 'weekly' ? 'Weekly' : 'Daily'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {statsView === 'daily' ? (
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
              <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2">
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#5B5EF4' + '20' }} className="items-center justify-center">
                  <Ionicons name="checkbox-outline" size={14} color="#5B5EF4" />
                </View>
                <Text className="text-text-primary font-bold text-2xl">{completedForDay}/{tasksForDay.length}</Text>
                <Text className="text-text-muted text-xs">Tasks done</Text>
              </View>
              <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2">
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#A855F7' + '20' }} className="items-center justify-center">
                  <Ionicons name="star" size={14} color="#A855F7" />
                </View>
                <Text className="text-xp font-bold text-2xl">{dailyXP > 0 ? `+${dailyXP}` : '0'}</Text>
                <Text className="text-text-muted text-xs">XP earned</Text>
              </View>
            </View>

            {/* Progress bar */}
            {tasksForDay.length > 0 && (
              <View className="bg-surface-overlay border border-border rounded-xl p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-muted text-xs font-medium">Completion</Text>
                  <Text className="text-text-secondary text-xs">
                    {tasksForDay.length > 0 ? Math.round((completedForDay / tasksForDay.length) * 100) : 0}%
                  </Text>
                </View>
                <PercentBar value={tasksForDay.length > 0 ? (completedForDay / tasksForDay.length) * 100 : 0} />
              </View>
            )}

            {/* Activity / history */}
            <Text className="text-text-secondary text-sm font-medium">Completed</Text>
            {xpEvents.length === 0 ? (
              <View className="items-center py-8 gap-2">
                <Ionicons name="checkmark-circle-outline" size={40} color="#2A2A32" />
                <Text className="text-text-muted text-sm text-center">Nothing completed yet this day</Text>
              </View>
            ) : (
              xpEvents.map((e) => {
                const isGoal = e.source_type === 'major_goal';
                const isHabit = e.source_id.length > 36;
                const iconName = isGoal ? 'flag' : isHabit ? 'repeat' : 'checkmark-circle';
                const iconColor = isGoal ? '#22C55E' : isHabit ? '#F59E0B' : '#5B5EF4';
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
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2">
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#3B82F6' + '20' }} className="items-center justify-center">
              <Ionicons name="calendar-outline" size={14} color="#3B82F6" />
            </View>
            <Text className="text-text-primary font-bold text-2xl">
              {user?.qualifying_days_total ?? 0}
            </Text>
            <Text className="text-text-muted text-xs">Qualifying days</Text>
          </View>
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2">
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#A855F7' + '20' }} className="items-center justify-center">
              <Ionicons name="star" size={14} color="#A855F7" />
            </View>
            <Text className="text-xp font-bold text-2xl">{formatXP(user?.xp_total ?? 0)}</Text>
            <Text className="text-text-muted text-xs">Total XP</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2">
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#22C55E' + '20' }} className="items-center justify-center">
              <Ionicons name="checkmark-circle-outline" size={14} color="#22C55E" />
            </View>
            <Text className="text-success font-bold text-2xl">
              {Math.round(avgCompletion * 100)}%
            </Text>
            <Text className="text-text-muted text-xs">Avg completion</Text>
          </View>
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-2">
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F59E0B' + '20' }} className="items-center justify-center">
              <Ionicons name="trophy-outline" size={14} color="#F59E0B" />
            </View>
            <Text className="text-warning font-bold text-2xl">{perfectWeeks}</Text>
            <Text className="text-text-muted text-xs">Perfect weeks</Text>
          </View>
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
