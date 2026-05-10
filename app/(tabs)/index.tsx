import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/hooks/useUser';
import { useGoals } from '@/hooks/useGoals';
import { useTasksForWeek } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui';
import { getRankById, getNextRank } from '@/constants/ranks';
import { XPBar } from '@/components/home/XPBar';
import { CompletionRing } from '@/components/home/CompletionRing';
import { RankBadge } from '@/components/rank/RankBadge';
import { XPToast } from '@/components/ui/XPToast';
import { formatXP } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function HomeScreen() {
  const { data: user, isLoading, refetch } = useUser();
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [] } = useGoals(weekStart);
  const { data: tasks = [] } = useTasksForWeek(weekStart);

  const currentRank = user ? getRankById(user.rank_id) : getRankById(1);
  const nextRank = getNextRank(currentRank.id);

  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const totalTasks = tasks.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  const weekLabel = format(parseISO(weekStart), 'MMM d') + ' – ' + format(parseISO(weekStart.replace(/\d{2}$/, (n) => String(+n + 6).padStart(2, '0'))), 'MMM d');

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <Text className="text-text-secondary text-base">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <XPToast />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {/* Header */}
        <View className="px-5 pt-14 pb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-text-secondary text-sm">Good work,</Text>
            <Text className="text-text-primary text-2xl font-bold">
              {user?.full_name?.split(' ')[0] ?? 'Warrior'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} className="p-2">
            <Ionicons name="person-circle-outline" size={28} color="#8888A0" />
          </TouchableOpacity>
        </View>

        {/* Week label */}
        <View className="px-5 pb-4">
          <Text className="text-text-muted text-sm">Week of {format(parseISO(weekStart), 'MMM d, yyyy')}</Text>
        </View>

        {/* Stats row */}
        <View className="px-5 flex-row gap-3 mb-5">
          <View className="flex-1 bg-surface-overlay border border-border rounded-2xl p-4 items-center gap-2">
            <CompletionRing completed={completedTasks} total={totalTasks} size={72} />
            <Text className="text-text-secondary text-xs text-center">Tasks this week</Text>
          </View>

          <View className="flex-1 gap-3">
            <View className="bg-surface-overlay border border-border rounded-2xl p-4 flex-1">
              <Text className="text-text-muted text-xs mb-1">Goals</Text>
              <Text className="text-text-primary font-bold text-2xl">{completedGoals}/{goals.length}</Text>
              <Text className="text-text-secondary text-xs">completed</Text>
            </View>
            <View className="bg-surface-overlay border border-border rounded-2xl p-4 flex-1">
              <Text className="text-text-muted text-xs mb-1">Total XP</Text>
              <Text className="text-xp font-bold text-2xl">{formatXP(user?.xp_total ?? 0)}</Text>
              <Text className="text-text-secondary text-xs">cumulative</Text>
            </View>
          </View>
        </View>

        {/* Rank card */}
        <View className="mx-5 bg-surface-overlay border border-border rounded-2xl p-5 gap-4 mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <RankBadge rank={currentRank} size="sm" />
              <View>
                <Text className="text-text-secondary text-xs">Current rank</Text>
                {nextRank && (
                  <Text className="text-text-muted text-xs">Next: {nextRank.title}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/rank')}>
              <Text className="text-accent text-sm">View →</Text>
            </TouchableOpacity>
          </View>
          <XPBar currentXP={user?.xp_total ?? 0} currentRank={currentRank} />
        </View>

        {/* Quick actions */}
        <View className="px-5 gap-3">
          <Text className="text-text-secondary text-sm font-medium">Quick actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/goals')}
              className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 items-center gap-2"
            >
              <Ionicons name="flag-outline" size={22} color="#5B5EF4" />
              <Text className="text-text-primary text-sm font-medium">Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/planner')}
              className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 items-center gap-2"
            >
              <Ionicons name="calendar-outline" size={22} color="#5B5EF4" />
              <Text className="text-text-primary text-sm font-medium">Planner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/performance')}
              className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 items-center gap-2"
            >
              <Ionicons name="bar-chart-outline" size={22} color="#5B5EF4" />
              <Text className="text-text-primary text-sm font-medium">Stats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
