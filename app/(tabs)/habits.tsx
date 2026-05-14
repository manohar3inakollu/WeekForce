import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { Task } from '@/types';
import { TASK_XP_BY_DIFFICULTY } from '@/constants/xp';
import { useTasksForWeek, useToggleRecurringTask, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useDailyXPEvents } from '@/hooks/useUser';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { todayDayLabel, dayIndexToLabel, CAT_COLORS } from '@/lib/utils';
import { CATEGORIES } from '@/constants/xp';
import { requestNotificationPermissions } from '@/lib/notifications';
import { awardXP } from '@/lib/xp';

const HABIT_CATS = ['all', ...CATEGORIES.map((c) => c.value)] as const;
type HabitCat = typeof HABIT_CATS[number];

function getDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function getLast7Days(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => getDateStr(subDays(today, 6 - i)));
}

function getDayLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE').slice(0, 2);
}

function isScheduledOn(habit: Task, date: Date): boolean {
  const dayLabel = dayIndexToLabel(date.getDay() === 0 ? 6 : date.getDay() - 1);
  switch (habit.recurrence_type) {
    case 'daily': return true;
    case 'weekly': return habit.scheduled_day === dayLabel;
    case 'custom': return habit.recurrence_days?.includes(dayLabel) ?? false;
    default: return false;
  }
}

function computeStreak(habit: Task): number {
  const dateSet = new Set(habit.completed_dates ?? []);
  const today = new Date();
  const todayStr = getDateStr(today);
  const todayScheduled = isScheduledOn(habit, today);
  // If today is scheduled but not yet done, don't penalise — preserve yesterday's streak
  let d = (todayScheduled && !dateSet.has(todayStr)) ? subDays(today, 1) : today;
  let streak = 0;
  for (let i = 0; i < 730; i++) {
    if (!isScheduledOn(habit, d)) { d = subDays(d, 1); continue; }
    if (!dateSet.has(getDateStr(d))) break;
    streak++;
    d = subDays(d, 1);
  }
  return streak;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

const STREAK_BONUS_XP: Record<number, number> = {
  3: 15, 7: 35, 14: 70, 30: 150, 50: 250, 100: 500,
};

function StreakCelebration({ streak, habitTitle, bonusXp, onDismiss }: { streak: number; habitTitle: string; bonusXp: number; onDismiss: () => void }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  const emoji = streak >= 100 ? '🏆' : streak >= 50 ? '🔥' : streak >= 30 ? '⚡' : streak >= 14 ? '💪' : streak >= 7 ? '🌟' : '🎉';

  return (
    <Modal transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', opacity }}>
        <Animated.View style={{ transform: [{ scale }], backgroundColor: '#13131e', borderWidth: 1.5, borderColor: '#5B5EF466', borderRadius: 24, padding: 32, alignItems: 'center', gap: 16, marginHorizontal: 32 }}>
          <LinearGradient
            colors={['#2A2B5E', '#1a1a3a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#5B5EF466' }}
          >
            <Text style={{ fontSize: 42 }}>{emoji}</Text>
          </LinearGradient>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#E8E8F2', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
              {streak}-Day Streak!
            </Text>
            <Text style={{ color: '#8888AA', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              {habitTitle}
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            {bonusXp > 0 && (
              <View style={{ backgroundColor: '#A855F720', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#A855F733' }}>
                <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 14 }}>+{bonusXp} Bonus XP earned!</Text>
              </View>
            )}
            <View style={{ backgroundColor: '#5B5EF418', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: '#8888AA', fontWeight: '600', fontSize: 13 }}>Keep it up! 🔥</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            style={{ backgroundColor: '#5B5EF4', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 14, marginTop: 4 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const HabitCard = React.memo(function HabitCard({
  habit,
  todayStr,
  last7Days,
  isDoneToday,
  isPending,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: Task;
  todayStr: string;
  last7Days: string[];
  isDoneToday: boolean;
  isPending: boolean;
  onToggle: (h: Task) => void;
  onEdit: (h: Task) => void;
  onDelete: (h: Task) => void;
}) {
  const _onToggle = useCallback(() => onToggle(habit), [onToggle, habit]);
  const _onEdit   = useCallback(() => onEdit(habit),   [onEdit,   habit]);
  const _onDelete = useCallback(() => onDelete(habit), [onDelete, habit]);
  const completedSet = new Set(habit.completed_dates ?? []);
  const streak = computeStreak(habit);
  const xpAmount = TASK_XP_BY_DIFFICULTY[habit.difficulty ?? 'medium'];
  const accentColor = habit.goal?.category ? (CAT_COLORS[habit.goal.category] ?? '#5B5EF4') : '#5B5EF4';

  const jsDay = new Date().getDay();
  const todayLabel = dayIndexToLabel(jsDay === 0 ? 6 : jsDay - 1);
  const isTodayScheduled =
    habit.recurrence_type === 'daily'
      ? true
      : habit.recurrence_type === 'weekly'
      ? habit.scheduled_day === todayLabel
      : habit.recurrence_type === 'custom'
      ? (habit.recurrence_days?.includes(todayLabel) ?? false)
      : false;

  const recurrenceLabel =
    habit.recurrence_type === 'daily'
      ? 'Daily'
      : habit.recurrence_type === 'weekly'
      ? `Every ${habit.scheduled_day}`
      : habit.recurrence_type === 'custom' && habit.recurrence_days?.length
      ? habit.recurrence_days.join(' · ')
      : '';

  return (
    <LinearGradient
      colors={[accentColor + '22', accentColor + '08', '#0b0b14']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1.2, y: 1 }}
      style={{
        borderWidth: 1,
        borderLeftWidth: 4,
        borderColor: accentColor + '44',
        borderLeftColor: accentColor,
        borderRadius: 16,
        padding: 16,
        gap: 12,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: '#E8E8F2', fontWeight: '600', fontSize: 15 }}>{habit.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {recurrenceLabel ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="repeat-outline" size={11} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 11 }}>{recurrenceLabel}</Text>
              </View>
            ) : null}
            {habit.goal?.category ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                backgroundColor: (CAT_COLORS[habit.goal.category] ?? '#6B7280') + '25',
                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
              }}>
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: CAT_COLORS[habit.goal.category] ?? '#6B7280' }} />
                <Text style={{ color: CAT_COLORS[habit.goal.category] ?? '#6B7280', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                  {habit.goal.category}
                </Text>
              </View>
            ) : null}
            {habit.goal ? (
              <Text style={{ color: '#44445A', fontSize: 11 }}>{habit.goal.title}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {streak > 0 && (
            <TouchableOpacity
              onPress={() => {
                const nextMilestone = STREAK_MILESTONES.find((m) => m > streak);
                const nextMsg = nextMilestone
                  ? `\n\n${nextMilestone - streak} more day${nextMilestone - streak === 1 ? '' : 's'} until your ${nextMilestone}-day milestone → +${STREAK_BONUS_XP[nextMilestone]} bonus XP`
                  : '\n\nYou\'ve hit all streak milestones. Legendary! 🏆';
                Alert.alert(
                  '🔥 ' + streak + '-Day Streak',
                  `${streak} consecutive scheduled day${streak === 1 ? '' : 's'} completed.\n\nMissing any scheduled day resets your streak to zero.${nextMsg}`,
                );
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Text style={{ fontSize: 15 }}>🔥</Text>
              <Text style={{ color: '#E8E8F2', fontWeight: '700', fontSize: 15 }}>{streak}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={_onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={15} color="#44445A" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={_onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color="#44445A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-day completion grid */}
      <TouchableOpacity
        onPress={() => Alert.alert('Last 7 Days', 'Each circle represents one day. Filled = completed on that day. The highlighted ring is today. Tap "Mark done" below to log today\'s completion.')}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={{ flexDirection: 'row', gap: 4 }}
        activeOpacity={0.85}
      >
        {last7Days.map((dateStr) => {
          const done = completedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <View key={dateStr} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#44445A', fontSize: 10 }}>{getDayLabel(dateStr)}</Text>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: done ? accentColor : isToday ? accentColor + '18' : 'transparent',
                  borderWidth: 1.5,
                  borderColor: done ? accentColor : isToday ? accentColor + '55' : '#252535',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </View>
          );
        })}
      </TouchableOpacity>

      {/* Toggle button */}
      {isTodayScheduled ? (
        <TouchableOpacity
          onPress={_onToggle}
          disabled={isPending}
          style={{
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: isDoneToday ? '#22C55E18' : accentColor + '18',
            borderWidth: 1,
            borderColor: isDoneToday ? '#22C55E44' : accentColor + '44',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            opacity: isPending ? 0.5 : 1,
          }}
        >
          <Ionicons
            name={isDoneToday ? 'checkmark-circle' : 'radio-button-off-outline'}
            size={15}
            color={isDoneToday ? '#22C55E' : accentColor}
          />
          <Text style={{ color: isDoneToday ? '#22C55E' : accentColor, fontWeight: '600', fontSize: 13 }}>
            {isPending ? '…' : isDoneToday ? 'Done today' : `Mark done · +${xpAmount} XP`}
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={{
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: '#13131e',
            borderWidth: 1,
            borderColor: '#252535',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="remove-circle-outline" size={15} color="#44445A" />
          <Text style={{ color: '#44445A', fontWeight: '600', fontSize: 13 }}>Not scheduled today</Text>
        </View>
      )}
    </LinearGradient>
  );
});

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();
  const { data: goals = [] } = useGoals(weekStart);
  const toggleRecurring = useToggleRecurringTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Task | null>(null);
  const [catFilter, setCatFilter] = useState<HabitCat>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ streak: number; title: string; bonusXp: number } | null>(null);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const last7Days = getLast7Days();

  // Use the same query as the planner so invalidations from useToggleRecurringTask hit it
  const { data: allTasks = [], isLoading, refetch, isRefetching } = useTasksForWeek(weekStart);
  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const habits = allTasks.filter((t) => t.recurrence_type !== 'none');
  const filteredHabits = (catFilter === 'all' ? habits : habits.filter((t) => (t.goal?.category ?? 'other') === catFilter))
    .slice()
    .sort((a, b) => (PRIORITY_RANK[a.priority ?? 'medium'] ?? 1) - (PRIORITY_RANK[b.priority ?? 'medium'] ?? 1));

  const { data: todayEvents = [] } = useDailyXPEvents(todayStr);
  const doneSourceIds = new Set(todayEvents.map((e) => e.source_id));

  const handleToggle = useCallback((habit: Task) => {
    if (pendingId) return;
    const alreadyDone = doneSourceIds.has(`${habit.id}_${todayStr}`);
    setPendingId(habit.id);
    toggleRecurring.mutate(
      { task: habit, dateStr: todayStr },
      {
        onSuccess: () => {
          if (!alreadyDone) {
            const updatedHabit = { ...habit, completed_dates: [...(habit.completed_dates ?? []), todayStr] };
            const streak = computeStreak(updatedHabit);
            if (STREAK_MILESTONES.includes(streak)) {
              const bonusXp = STREAK_BONUS_XP[streak] ?? 0;
              if (bonusXp > 0 && session) {
                awardXP(session.user.id, 'streak_bonus', `${habit.id}_streak_${streak}`, bonusXp)
                  .then(() => {
                    qc.invalidateQueries({ queryKey: ['user', session.user.id] });
                    qc.invalidateQueries({ queryKey: ['xp_events', session.user.id] });
                  })
                  .catch(() => {});
              }
              setCelebration({ streak, title: habit.title, bonusXp });
            }
          }
        },
        onSettled: () => setPendingId(null),
      },
    );
  }, [pendingId, doneSourceIds, todayStr, toggleRecurring]);

  const handleDelete = useCallback((habit: Task) => {
    Alert.alert('Delete habit?', `"${habit.title}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(habit.id) },
    ]);
  }, [deleteTask]);

  const handleCreate = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync({ ...data, due_date: weekStart });
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleEditSave = async (data: TaskFormData) => {
    if (!editingHabit) return;
    try {
      await updateTask.mutateAsync({ id: editingHabit.id, updates: { ...data } });
      setEditingHabit(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b14' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#252535',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#E8E8F2', fontSize: 24, fontWeight: '800' }}>Habits</Text>
            <TouchableOpacity
              onPress={() => Alert.alert(
                'Streak Rewards',
                'Complete a habit on every scheduled day to build a streak. Missing a scheduled day resets it to zero.\n\nBonus XP at milestones:\n\n🎉  3 days  →  +15 XP\n🌟  7 days  →  +35 XP\n💪  14 days  →  +70 XP\n⚡  30 days  →  +150 XP\n🔥  50 days  →  +250 XP\n🏆  100 days  →  +500 XP',
              )}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="information-circle-outline" size={18} color="#44445A" />
            </TouchableOpacity>
          </View>
          {habits.length > 0 && (
            <Text style={{ color: '#44445A', fontSize: 12 }}>
              {habits.length} habit{habits.length !== 1 ? 's' : ''} · streaks earn bonus XP
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#6B6EFF', '#5B5EF4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New Habit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' }}
        style={{ flexShrink: 0, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#252535' }}
      >
        {HABIT_CATS.map((cat) => {
          const on = catFilter === cat;
          const col = cat === 'all' ? '#5B5EF4' : (CAT_COLORS[cat] ?? '#6B7280');
          const count = cat === 'all'
            ? habits.length
            : habits.filter((t) => (t.goal?.category ?? 'other') === cat).length;
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 64 }}>
            <Text style={{ color: '#44445A' }}>Loading…</Text>
          </View>
        ) : filteredHabits.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 16 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#13131e',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#252535',
              }}
            >
              <Ionicons name="repeat-outline" size={34} color="#5B5EF4" />
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontWeight: '600', fontSize: 16 }}>
                No habits yet
              </Text>
              <Text
                style={{
                  color: '#44445A',
                  fontSize: 13,
                  textAlign: 'center',
                  paddingHorizontal: 32,
                  lineHeight: 20,
                }}
              >
                Habits are recurring tasks you want to do daily, weekly, or on specific days.
                Track streaks and stay consistent.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={{ borderRadius: 12, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#6B6EFF', '#5B5EF4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Add your first habit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          filteredHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              todayStr={todayStr}
              last7Days={last7Days}
              isDoneToday={doneSourceIds.has(`${habit.id}_${todayStr}`)}
              isPending={pendingId === habit.id}
              onToggle={handleToggle}
              onEdit={setEditingHabit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      {celebration && (
        <StreakCelebration
          streak={celebration.streak}
          habitTitle={celebration.title}
          bonusXp={celebration.bonusXp}
          onDismiss={() => setCelebration(null)}
        />
      )}

      <TaskForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
        loading={createTask.isPending}
        goals={goals}
        defaultDay={todayDayLabel()}
        mode="create"
        initial={{ recurrence_type: 'daily' }}
      />

      <TaskForm
        visible={!!editingHabit}
        onClose={() => setEditingHabit(null)}
        onSubmit={handleEditSave}
        loading={updateTask.isPending}
        goals={goals}
        mode="edit"
        initial={editingHabit ? {
          title: editingHabit.title,
          scheduled_day: editingHabit.scheduled_day,
          goal_id: editingHabit.goal_id ?? null,
          start_time: editingHabit.start_time ?? null,
          estimated_minutes: editingHabit.estimated_minutes ?? 30,
          priority: editingHabit.priority ?? 'medium',
          difficulty: editingHabit.difficulty ?? 'medium',
          recurrence_type: editingHabit.recurrence_type ?? 'daily',
          recurrence_days: editingHabit.recurrence_days ?? null,
        } : undefined}
      />
    </View>
  );
}
