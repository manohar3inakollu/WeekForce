import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/hooks/useUser';
import { useGoals } from '@/hooks/useGoals';
import { useTasksForWeek } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui';
import { getRankById, getNextRank } from '@/constants/ranks';
import { XPBar } from '@/components/home/XPBar';
import { CompletionRing } from '@/components/home/CompletionRing';
import { RankBadge } from '@/components/rank/RankBadge';
import { XPToast } from '@/components/ui/XPToast';
import { formatXP, todayDayLabel } from '@/lib/utils';
import { format, parseISO, addDays } from 'date-fns';

export default function HomeScreen() {
  const { data: user, isLoading, refetch } = useUser();
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [] } = useGoals(weekStart);
  const { data: tasks = [] } = useTasksForWeek(weekStart);

  const [taskView, setTaskView] = useState<'week' | 'today'>('today');

  const currentRank = user ? getRankById(user.rank_id) : getRankById(1);
  const nextRank = getNextRank(currentRank.id);

  const todayLabel = todayDayLabel();
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const totalTasks = tasks.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  const todayTasks = tasks.filter((t) => {
    const rt = t.recurrence_type ?? 'none';
    if (rt === 'daily') return true;
    if (rt === 'weekly') return t.scheduled_day === todayLabel;
    if (rt === 'custom') return t.recurrence_days?.includes(todayLabel) ?? false;
    return t.scheduled_day === todayLabel;
  });
  const completedToday = todayTasks.filter((t) =>
    t.recurrence_type !== 'none'
      ? (t.completed_dates?.includes(todayDateStr) ?? false)
      : t.is_completed
  ).length;

  const ringCompleted = taskView === 'week' ? completedTasks : completedToday;
  const ringTotal = taskView === 'week' ? totalTasks : todayTasks.length;

  const initials = (user?.full_name ?? '?').charAt(0).toUpperCase();
  const firstName = user?.full_name?.split(' ')[0] ?? 'Warrior';

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
            <Text className="text-text-primary text-2xl font-bold">{firstName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View
              style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#5B5EF4' + '66', backgroundColor: '#2A2B5E' }}
              className="items-center justify-center"
            >
              <Text style={{ color: '#A0A3FF', fontSize: 16, fontWeight: '700' }}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Week label */}
        <View className="px-5 pb-4">
          <Text className="text-text-muted text-sm">Week of {format(parseISO(weekStart), 'MMM d, yyyy')}</Text>
        </View>

        {/* Stats row */}
        <View className="px-5 flex-row gap-3 mb-5">
          <View className="flex-1 bg-surface-overlay border border-border rounded-2xl p-3 items-center gap-2">
            <View style={{ flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 8, padding: 2, alignSelf: 'stretch' }}>
              {(['week', 'today'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setTaskView(v)}
                  style={{
                    flex: 1, paddingVertical: 5, borderRadius: 6, alignItems: 'center',
                    backgroundColor: taskView === v ? '#2A2A32' : 'transparent',
                  }}
                >
                  <Text style={{ color: taskView === v ? '#E8E8F0' : '#55556A', fontSize: 11, fontWeight: '600' }}>
                    {v === 'week' ? 'Week' : 'Today'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <CompletionRing completed={ringCompleted} total={ringTotal} size={100} />
            <Text className="text-text-secondary text-xs text-center">
              {taskView === 'week' ? 'Tasks this week' : 'Tasks today'}
            </Text>
          </View>

          <View className="flex-1 gap-3">
            <View className="bg-surface-overlay border border-border rounded-2xl p-4 flex-1">
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#22C55E' + '20' }} className="items-center justify-center mb-2">
                <Ionicons name="flag" size={14} color="#22C55E" />
              </View>
              <Text className="text-text-primary font-bold text-2xl">{completedGoals}/{goals.length}</Text>
              <Text className="text-text-muted text-xs">goals done</Text>
            </View>
            <View className="bg-surface-overlay border border-border rounded-2xl p-4 flex-1">
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#A855F7' + '20' }} className="items-center justify-center mb-2">
                <Ionicons name="star" size={14} color="#A855F7" />
              </View>
              <Text className="text-xp font-bold text-2xl">{formatXP(user?.xp_total ?? 0)}</Text>
              <Text className="text-text-muted text-xs">total XP</Text>
            </View>
          </View>
        </View>

        {/* Rank card */}
        <View className="mx-5 mb-5 rounded-2xl overflow-hidden border border-border">
          <LinearGradient
            colors={['#222228', '#1a1a2e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5 gap-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <RankBadge rank={currentRank} size="sm" />
                <View>
                  <Text className="text-text-primary font-semibold text-sm">{currentRank.title}</Text>
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
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <View className="px-5 gap-3">
          <Text className="text-text-muted text-xs font-semibold tracking-widest uppercase">Quick actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/goals')}
              className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 items-center gap-2"
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#5B5EF4' + '20' }} className="items-center justify-center">
                <Ionicons name="flag-outline" size={20} color="#5B5EF4" />
              </View>
              <Text className="text-text-primary text-sm font-medium">Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/planner')}
              className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 items-center gap-2"
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F59E0B' + '20' }} className="items-center justify-center">
                <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
              </View>
              <Text className="text-text-primary text-sm font-medium">Planner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/performance')}
              className="flex-1 bg-surface-overlay border border-border rounded-xl p-4 items-center gap-2"
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#22C55E' + '20' }} className="items-center justify-center">
                <Ionicons name="bar-chart-outline" size={20} color="#22C55E" />
              </View>
              <Text className="text-text-primary text-sm font-medium">Stats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
