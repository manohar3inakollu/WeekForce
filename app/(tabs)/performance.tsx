import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWeeklySummaries } from '@/hooks/useWeeklySummary';
import { useUser } from '@/hooks/useUser';
import { format, parseISO } from 'date-fns';
import { formatXP, clamp } from '@/lib/utils';

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

export default function PerformanceScreen() {
  const { data: summaries = [], isLoading, refetch } = useWeeklySummaries(12);
  const { data: user } = useUser();

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
        <Text className="text-text-primary text-2xl font-bold">Performance</Text>
        <Text className="text-text-secondary text-sm">Your progress over time</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {/* Overview stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-1">
            <Text className="text-text-muted text-xs">Qualifying days</Text>
            <Text className="text-text-primary font-bold text-2xl">
              {user?.qualifying_days_total ?? 0}
            </Text>
          </View>
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-1">
            <Text className="text-text-muted text-xs">Total XP</Text>
            <Text className="text-xp font-bold text-2xl">{formatXP(user?.xp_total ?? 0)}</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-1">
            <Text className="text-text-muted text-xs">Avg completion</Text>
            <Text className="text-success font-bold text-2xl">
              {Math.round(avgCompletion * 100)}%
            </Text>
          </View>
          <View className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 gap-1">
            <Text className="text-text-muted text-xs">Perfect weeks</Text>
            <Text className="text-warning font-bold text-2xl">{perfectWeeks}</Text>
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
      </ScrollView>
    </View>
  );
}
