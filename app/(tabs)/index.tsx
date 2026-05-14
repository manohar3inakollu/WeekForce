import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { format, addDays, parseISO, differenceInDays, isValid } from 'date-fns';
import { useUser, useDailyXPEvents } from '@/hooks/useUser';
import { useGoals, useCreateGoal } from '@/hooks/useGoals';
import { useMilestones, useCreateMilestone } from '@/hooks/useMilestones';
import {
  useTasksForWeek,
  useUpdateTaskStatus,
  useUncompleteTask,
  useToggleRecurringTask,
  useCreateTask,
} from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui';
import { DAYS_OF_WEEK, TASK_XP_BY_DIFFICULTY, RANK_NAMES, DIFFICULTIES, GOAL_XP_BY_DIFFICULTY, MILESTONE_XP_BY_DIFFICULTY } from '@/constants/xp';
import { DAILY_XP_TARGETS, Task } from '@/types';
import { todayDayLabel, clamp, CAT_COLORS, PRIORITY_COLORS, isTaskOverdue, isDateOverdue } from '@/lib/utils';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { GoalForm } from '@/components/goals/GoalForm';
import { MilestoneForm, MilestoneFormData } from '@/components/goals/MilestoneForm';


function Ring({ completed, total }: { completed: number; total: number }) {
  const size = 88;
  const sw = 8;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? clamp(completed / total, 0, 1) : 0;
  const offset = circ * (1 - pct);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#16162a" strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#5B5EF4" strokeWidth={sw} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {total === 0 ? (
          <Text style={{ color: '#44445A', fontSize: 10, textAlign: 'center' }}>No{'\n'}tasks</Text>
        ) : (
          <>
            <Text style={{ color: '#E8E8F2', fontWeight: '800', fontSize: 17 }}>{Math.round(pct * 100)}%</Text>
            <Text style={{ color: '#8888AA', fontSize: 9 }}>{completed}/{total}</Text>
          </>
        )}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: user, isLoading, refetch: refetchUser } = useUser();
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [], refetch: refetchGoals } = useGoals(weekStart);
  const { data: tasks = [], isRefetching, refetch: refetchTasks } = useTasksForWeek(weekStart);
  const { data: allMilestones = [], refetch: refetchMilestones } = useMilestones();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayEvents = [] } = useDailyXPEvents(todayStr);

  const updateStatus = useUpdateTaskStatus();
  const uncompleteTask = useUncompleteTask();
  const toggleRecurring = useToggleRecurringTask();
  const createTask = useCreateTask();
  const createGoal = useCreateGoal();
  const createMilestone = useCreateMilestone();

  const handleRefresh = useCallback(() => {
    refetchUser();
    refetchTasks();
    refetchGoals();
    refetchMilestones();
  }, [refetchUser, refetchTasks, refetchGoals, refetchMilestones]);

  useFocusEffect(
    useCallback(() => {
      refetchUser();
      refetchGoals();
      refetchTasks();
      refetchMilestones();
    }, [refetchUser, refetchGoals, refetchTasks, refetchMilestones])
  );

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const todayLabel = todayDayLabel();
  const todayIdx = DAYS_OF_WEEK.indexOf(todayLabel);
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0);

  const weekStart_date = parseISO(weekStart);
  const selectedDay = DAYS_OF_WEEK[selectedDayIdx];
  const selectedDate = format(addDays(weekStart_date, selectedDayIdx), 'yyyy-MM-dd');

  const getTasksForDay = (day: string) =>
    tasks.filter((t) => {
      const rt = t.recurrence_type ?? 'none';
      if (rt === 'daily') return true;
      if (rt === 'weekly') return t.scheduled_day === day;
      if (rt === 'custom') return t.recurrence_days?.includes(day as any) ?? false;
      return t.scheduled_day === day;
    });

  const todayTasks = getTasksForDay(todayLabel);
  const completedToday = todayTasks.filter((t) =>
    t.recurrence_type !== 'none'
      ? (t.completed_dates?.includes(todayStr) ?? false)
      : t.is_completed
  ).length;

  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const dayTasks = [...getTasksForDay(selectedDay)].sort((a, b) => {
    const aOver = isTaskOverdue(a) ? 0 : 1;
    const bOver = isTaskOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    return (PRIORITY_RANK[a.priority ?? 'medium'] ?? 1) - (PRIORITY_RANK[b.priority ?? 'medium'] ?? 1);
  });
  const isTaskDone = (task: Task) =>
    task.recurrence_type !== 'none'
      ? (task.completed_dates?.includes(selectedDate) ?? false)
      : task.is_completed;

  const handleToggle = (task: Task) => {
    if (task.recurrence_type !== 'none') {
      toggleRecurring.mutate({ task, dateStr: selectedDate });
      return;
    }
    if (task.is_completed) uncompleteTask.mutate(task.id);
    else updateStatus.mutate({ task, status: 'done' });
  };

  const handleCreateTask = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync(data);
      setShowTaskForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      await createGoal.mutateAsync(data);
      setShowGoalForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleCreateMilestone = async (data: MilestoneFormData) => {
    try {
      await createMilestone.mutateAsync(data);
      setShowMilestoneForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const xpEarned = todayEvents.reduce((s, e) => s + e.xp_amount, 0);
  const dailyTarget = DAILY_XP_TARGETS[user?.daily_xp_target ?? 'regular'];
  const xpPct = Math.min((xpEarned / dailyTarget) * 100, 100);
  const firstName = user?.full_name?.split(' ')[0] ?? '';
  const initials = (user?.full_name ?? '?').charAt(0).toUpperCase();
  const dateLabel = format(new Date(), 'EEEE · MMM d');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const previewGoals = goals.slice(0, 2);
  const activeMilestones = allMilestones.filter((m) => m.status === 'active').slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b14' }}>
      {/* Hero */}
      <LinearGradient
        colors={['#1d1050', '#110d2e', '#0b0b14']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <View>
            <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 3 }}>
              {dateLabel}
            </Text>
            <Text style={{ color: '#E8E8F2', fontSize: 24, fontWeight: '700', lineHeight: 30 }}>
              {greeting}{firstName ? ', ' : ''}<Text style={{ color: '#5B5EF4' }}>{firstName}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#2A2B5E', borderWidth: 1.5, borderColor: '#5B5EF466', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#A0A3FF', fontSize: 16, fontWeight: '700' }}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Ring completed={dayTasks.filter((t) => isTaskDone(t)).length} total={dayTasks.length} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <TouchableOpacity
                onPress={() => Alert.alert('Daily XP', 'XP earned today from completing tasks, habits, and goals. Hit your daily target to earn a qualifying day — these count toward rank progression.')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              >
                <Text style={{ color: '#8888AA', fontSize: 11 }}>Daily XP</Text>
                <Ionicons name="information-circle-outline" size={11} color="#44445A" />
              </TouchableOpacity>
              <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 11 }}>{xpEarned} / {dailyTarget}</Text>
            </View>
            <View style={{ height: 7, backgroundColor: '#181828', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              <View style={{ height: '100%', width: `${xpPct}%`, backgroundColor: '#A855F7', borderRadius: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => Alert.alert('Your Rank', 'Ranks reflect your total XP and qualifying days. Complete tasks consistently to earn qualifying days and climb the leaderboard.')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              >
                <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 11 }}>
                  Rank {user?.rank_id ?? 1} · {RANK_NAMES[user?.rank_id ?? 1]}
                </Text>
                <Ionicons name="information-circle-outline" size={11} color="#3B82F666" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert('Qualifying Days', 'Days where you hit your Daily XP target. These count toward rank progression — each rank requires a minimum number of qualifying days in addition to total XP.')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              >
                <Text style={{ color: '#44445A', fontSize: 11 }}>{user?.qualifying_days_total ?? 0} qual. days</Text>
                <Ionicons name="information-circle-outline" size={11} color="#44445A" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Day strip */}
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0b0b14' }}>
        {DAYS_OF_WEEK.map((day, i) => {
          const sel = i === selectedDayIdx;
          const isToday = day === todayLabel;
          const hasTasks = getTasksForDay(day).length > 0;
          const dateNum = format(addDays(weekStart_date, i), 'd');
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDayIdx(i)}
              style={{
                flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, borderRadius: 12,
                backgroundColor: sel ? '#5B5EF4' : isToday ? '#5B5EF412' : '#13131e',
                borderWidth: 1, borderColor: sel ? '#5B5EF4' : isToday ? '#5B5EF455' : '#252535',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: sel ? '#fff' : isToday ? '#5B5EF4' : '#44445A' }}>
                {day.slice(0, 3)}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: sel ? '#fff' : isToday ? '#5B5EF4' : '#8888AA' }}>
                {dateNum}
              </Text>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: hasTasks ? (sel ? 'rgba(255,255,255,0.7)' : '#22C55E') : 'transparent' }} />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#5B5EF4" />}
      >
        {/* Task section */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', color: '#44445A' }}>
              {selectedDay === todayLabel ? "Today's Missions" : `${selectedDay}'s Tasks`}
            </Text>
            <TouchableOpacity onPress={() => setShowTaskForm(true)}>
              <Text style={{ color: '#5B5EF4', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8 }}>
            {dayTasks.length === 0 ? (
              <TouchableOpacity
                onPress={() => setShowTaskForm(true)}
                style={{ borderWidth: 1, borderColor: '#252535', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="add-circle-outline" size={22} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 13 }}>No tasks · tap to add</Text>
              </TouchableOpacity>
            ) : (
              dayTasks.map((task) => {
                const done = isTaskDone(task);
                const priColor = PRIORITY_COLORS[task.priority ?? 'medium'];
                const diff = DIFFICULTIES.find((d) => d.value === (task.difficulty ?? 'medium'));
                const diffColor = diff?.color ?? '#F59E0B';
                const xp = TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium'];
                const cat = task.goal?.category;
                const catColor = cat ? CAT_COLORS[cat] : undefined;
                const priLabel = (task.priority ?? 'medium').charAt(0).toUpperCase() + (task.priority ?? 'medium').slice(1);
                const timeLabel = task.start_time
                  ? (() => { const [h, m] = task.start_time.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`; })()
                  : null;
                return (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push(`/task/${task.id}`)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: done ? '#0e0e18' : '#13131e',
                      borderWidth: 1, borderColor: '#252535',
                      borderLeftWidth: 3, borderLeftColor: done ? '#44445A' : priColor,
                      borderRadius: 14, padding: 12, gap: 8,
                      opacity: done ? 0.65 : 1,
                    }}
                  >
                    {/* Title row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => handleToggle(task)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                          width: 20, height: 20, borderRadius: 10,
                          borderWidth: 2, borderColor: done ? '#22C55E' : '#2A2A32',
                          backgroundColor: done ? '#22C55E' : 'transparent',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </TouchableOpacity>
                      <Text
                        style={{ fontSize: 13, fontWeight: '600', color: done ? '#44445A' : '#E8E8F2', textDecorationLine: done ? 'line-through' : 'none', flex: 1 }}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      <View style={{ backgroundColor: done ? '#44445A18' : diffColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0 }}>
                        <Text style={{ color: done ? '#44445A' : diffColor, fontWeight: '700', fontSize: 9 }}>
                          {done ? '✓ ' : '+'}{xp} XP
                        </Text>
                      </View>
                    </View>

                    {/* Badges row */}
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingLeft: 30, flexWrap: 'wrap' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: (done ? '#44445A' : priColor) + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: done ? '#44445A' : priColor }} />
                        <Text style={{ color: done ? '#44445A' : priColor, fontSize: 9, fontWeight: '700' }}>{priLabel}</Text>
                      </View>
                      {cat && catColor && (
                        <View style={{ backgroundColor: catColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: catColor, fontSize: 9, fontWeight: '700', textTransform: 'capitalize' }}>{cat}</Text>
                        </View>
                      )}
                      {timeLabel && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="time-outline" size={10} color="#55556A" />
                          <Text style={{ fontSize: 9, color: '#55556A' }}>{timeLabel}</Text>
                        </View>
                      )}
                      {isTaskOverdue(task, done) && (
                        <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '700' }}>Overdue</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Goals preview */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', color: '#44445A' }}>
              This Week's Goals
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {goals.length > 2 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                  <Text style={{ color: '#8888AA', fontSize: 12, fontWeight: '600' }}>See all {goals.length} →</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowGoalForm(true)}>
                <Text style={{ color: '#5B5EF4', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {previewGoals.length === 0 ? (
              <TouchableOpacity
                onPress={() => setShowGoalForm(true)}
                style={{ borderWidth: 1, borderColor: '#252535', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="flag-outline" size={22} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 13 }}>No goals · tap to add</Text>
              </TouchableOpacity>
            ) : (
              previewGoals.map((g) => {
                const goalTasks = tasks.filter((t) => t.goal_id === g.id);
                const doneTasks = goalTasks.filter((t) =>
                  t.recurrence_type !== 'none'
                    ? (t.completed_dates?.includes(todayStr) ?? false)
                    : t.is_completed
                ).length;
                const catColor = CAT_COLORS[g.category] ?? '#6B7280';
                const pct = goalTasks.length > 0 ? doneTasks / goalTasks.length : 0;
                const diff = DIFFICULTIES.find((d) => d.value === (g.difficulty ?? 'medium'));
                const diffColor = diff?.color ?? '#F59E0B';
                const goalXp = GOAL_XP_BY_DIFFICULTY[g.difficulty ?? 'medium'];
                const dueDateStr = g.due_date && isValid(parseISO(g.due_date))
                  ? format(parseISO(g.due_date), 'MMM d')
                  : null;
                const isOverdue = g.status !== 'completed' && isDateOverdue(g.due_date);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => router.push(`/goal/${g.id}`)}
                    style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderLeftWidth: 3, borderLeftColor: catColor, borderRadius: 14, padding: 12, gap: 8 }}
                  >
                    {/* Title row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: g.status === 'completed' ? '#44445A' : '#E8E8F2', flex: 1, textDecorationLine: g.status === 'completed' ? 'line-through' : 'none' }} numberOfLines={1}>
                        {g.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#8888AA', flexShrink: 0 }}>{doneTasks}/{goalTasks.length} this week</Text>
                    </View>

                    {/* Badges row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: catColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: catColor, fontSize: 9, fontWeight: '700', textTransform: 'capitalize' }}>{g.category}</Text>
                      </View>
                      <View style={{ backgroundColor: diffColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ color: diffColor, fontSize: 9, fontWeight: '700' }}>{diff?.label ?? 'Medium'}</Text>
                        <Text style={{ color: diffColor + 'AA', fontSize: 9 }}>· +{goalXp} XP</Text>
                      </View>
                      {dueDateStr && (
                        <Text style={{ color: isOverdue ? '#F87171' : '#55556A', fontSize: 9, fontWeight: '600' }}>
                          {isOverdue ? 'Overdue' : `Due ${dueDateStr}`}
                        </Text>
                      )}
                    </View>

                    {/* Progress bar */}
                    <View style={{ height: 4, backgroundColor: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: catColor, borderRadius: 3 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
        {/* Milestones */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', color: '#44445A' }}>
              Milestones
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {allMilestones.filter((m) => m.status === 'active').length > 3 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                  <Text style={{ color: '#8888AA', fontSize: 12, fontWeight: '600' }}>See all {allMilestones.filter((m) => m.status === 'active').length} →</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowMilestoneForm(true)}>
                <Text style={{ color: '#5B5EF4', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {activeMilestones.length === 0 ? (
              <TouchableOpacity
                onPress={() => setShowMilestoneForm(true)}
                style={{ borderWidth: 1, borderColor: '#252535', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="trophy-outline" size={22} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 13 }}>No milestones · tap to add</Text>
              </TouchableOpacity>
            ) : (
              activeMilestones.map((m) => {
                const col = CAT_COLORS[m.category] ?? '#6B7280';
                const startValid = !!m.start_date && isValid(parseISO(m.start_date));
                const dueValid = !!m.due_date && isValid(parseISO(m.due_date));
                const diff = DIFFICULTIES.find((d) => d.value === (m.difficulty ?? 'medium'));
                const diffColor = diff?.color ?? '#F59E0B';
                const milestoneXp = MILESTONE_XP_BY_DIFFICULTY[m.difficulty ?? 'medium'];
                const mIsOverdue = isDateOverdue(m.due_date);
                let pct = 0;
                let daysLeft = 0;
                if (startValid && dueValid) {
                  const total = differenceInDays(parseISO(m.due_date!), parseISO(m.start_date!));
                  const elapsed = differenceInDays(new Date(), parseISO(m.start_date!));
                  pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
                  daysLeft = Math.max(0, differenceInDays(parseISO(m.due_date!), new Date()));
                }
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => router.push(`/milestone/${m.id}` as any)}
                    activeOpacity={0.8}
                    style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: col + '44', borderLeftWidth: 3, borderLeftColor: col, borderRadius: 14, padding: 12, gap: 8 }}
                  >
                    {/* Title + days left */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#E8E8F2', flex: 1 }} numberOfLines={1}>{m.title}</Text>
                      {dueValid && (
                        <Text style={{ fontSize: 10, color: mIsOverdue ? '#EF4444' : daysLeft === 0 ? '#F87171' : '#55556A', flexShrink: 0, fontWeight: '600' }}>
                          {mIsOverdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                        </Text>
                      )}
                    </View>

                    {/* Badges row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: col + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: col, fontSize: 9, fontWeight: '700', textTransform: 'capitalize' }}>{m.category}</Text>
                      </View>
                      <View style={{ backgroundColor: diffColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ color: diffColor, fontSize: 9, fontWeight: '700' }}>{diff?.label ?? 'Medium'}</Text>
                        <Text style={{ color: diffColor + 'AA', fontSize: 9 }}>· +{milestoneXp.toLocaleString()} XP</Text>
                      </View>
                      {startValid && dueValid && (
                        <TouchableOpacity
                          onPress={() => Alert.alert('Timeline', 'Percentage of calendar time elapsed between start and target dates. Use it to pace your progress — if elapsed time exceeds your goal completion, you may be falling behind.')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={{ marginLeft: 'auto' }}
                        >
                          <Text style={{ color: '#55556A', fontSize: 9 }}>{Math.round(pct)}% elapsed ⓘ</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Time progress bar */}
                    {startValid && dueValid && (
                      <View style={{ height: 4, backgroundColor: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: col, borderRadius: 3 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <TaskForm
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={handleCreateTask}
        loading={createTask.isPending}
        goals={goals}
        defaultDay={selectedDay as any}
        defaultDate={selectedDate}
      />

      <GoalForm
        visible={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        onSubmit={handleCreateGoal}
        loading={createGoal.isPending}
        milestones={allMilestones}
      />

      <MilestoneForm
        visible={showMilestoneForm}
        onClose={() => setShowMilestoneForm(false)}
        onSubmit={handleCreateMilestone}
        loading={createMilestone.isPending}
      />
    </View>
  );
}
