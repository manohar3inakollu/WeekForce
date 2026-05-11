import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { Task } from '@/types';
import { TASK_XP_BY_DIFFICULTY } from '@/constants/xp';
import { useTasksForWeek, useToggleRecurringTask, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useDailyXPEvents } from '@/hooks/useUser';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { XPToast } from '@/components/ui/XPToast';
import { todayDayLabel, dayIndexToLabel } from '@/lib/utils';

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

function computeStreak(completedDates: string[]): number {
  const dateSet = new Set(completedDates);
  let streak = 0;
  let d = new Date();
  while (dateSet.has(getDateStr(d))) {
    streak++;
    d = subDays(d, 1);
  }
  return streak;
}

function HabitCard({
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
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const completedSet = new Set(habit.completed_dates ?? []);
  const streak = computeStreak(habit.completed_dates ?? []);
  const xpAmount = TASK_XP_BY_DIFFICULTY[habit.difficulty ?? 'medium'];

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
    <View
      style={{
        backgroundColor: '#1A1A22',
        borderWidth: 1,
        borderColor: '#2A2A32',
        borderRadius: 20,
        padding: 16,
        gap: 12,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: '#E8E8FF', fontWeight: '600', fontSize: 15 }}>{habit.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {recurrenceLabel ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="repeat-outline" size={11} color="#55556A" />
                <Text style={{ color: '#55556A', fontSize: 11 }}>{recurrenceLabel}</Text>
              </View>
            ) : null}
            {habit.goal ? (
              <Text style={{ color: '#55556A', fontSize: 11 }}>· {habit.goal.title}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 15 }}>🔥</Text>
              <Text style={{ color: '#E8E8FF', fontWeight: '700', fontSize: 15 }}>{streak}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={15} color="#55556A" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color="#55556A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-day completion grid */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {last7Days.map((dateStr) => {
          const done = completedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <View key={dateStr} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#55556A', fontSize: 10 }}>{getDayLabel(dateStr)}</Text>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: done ? '#5B5EF4' : isToday ? '#1E1E2A' : '#13131A',
                  borderWidth: 1.5,
                  borderColor: done ? '#5B5EF4' : isToday ? '#5B5EF466' : '#2A2A32',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </View>
          );
        })}
      </View>

      {/* Toggle button */}
      {isTodayScheduled ? (
        <TouchableOpacity
          onPress={onToggle}
          disabled={isPending}
          style={{
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: isDoneToday ? '#22C55E18' : '#5B5EF418',
            borderWidth: 1,
            borderColor: isDoneToday ? '#22C55E44' : '#5B5EF444',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            opacity: isPending ? 0.5 : 1,
          }}
        >
          <Ionicons
            name={isDoneToday ? 'checkmark-circle' : 'radio-button-off-outline'}
            size={15}
            color={isDoneToday ? '#22C55E' : '#5B5EF4'}
          />
          <Text style={{ color: isDoneToday ? '#22C55E' : '#5B5EF4', fontWeight: '600', fontSize: 13 }}>
            {isPending ? '…' : isDoneToday ? 'Done today' : `Mark done · +${xpAmount} XP`}
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={{
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: '#13131A',
            borderWidth: 1,
            borderColor: '#2A2A32',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="remove-circle-outline" size={15} color="#3A3A4A" />
          <Text style={{ color: '#3A3A4A', fontWeight: '600', fontSize: 13 }}>Not scheduled today</Text>
        </View>
      )}
    </View>
  );
}

export default function HabitsScreen() {
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [] } = useGoals(weekStart);
  const toggleRecurring = useToggleRecurringTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Task | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const last7Days = getLast7Days();

  // Use the same query as the planner so invalidations from useToggleRecurringTask hit it
  const { data: allTasks = [], isLoading, refetch, isRefetching } = useTasksForWeek(weekStart);
  const habits = allTasks.filter((t) => t.recurrence_type !== 'none');

  const { data: todayEvents = [] } = useDailyXPEvents(todayStr);
  const doneSourceIds = new Set(todayEvents.map((e) => e.source_id));

  const handleToggle = (habit: Task) => {
    if (pendingId) return;
    setPendingId(habit.id);
    toggleRecurring.mutate(
      { task: habit, dateStr: todayStr },
      { onSettled: () => setPendingId(null) },
    );
  };

  const handleDelete = (habit: Task) => {
    Alert.alert('Delete habit?', `"${habit.title}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(habit.id) },
    ]);
  };

  const handleCreate = async (data: TaskFormData) => {
    await createTask.mutateAsync({ ...data, due_date: weekStart });
    setShowForm(false);
  };

  const handleEditSave = async (data: TaskFormData) => {
    if (!editingHabit) return;
    await updateTask.mutateAsync({ id: editingHabit.id, updates: { ...data } });
    setEditingHabit(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F11' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2A32',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ color: '#E8E8FF', fontSize: 22, fontWeight: '700' }}>Habits</Text>
          {habits.length > 0 && (
            <Text style={{ color: '#55556A', fontSize: 12, marginTop: 1 }}>
              {habits.length} habit{habits.length !== 1 ? 's' : ''} · tap to track today
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={{
            backgroundColor: '#5B5EF4',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 9,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New Habit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 64 }}>
            <Text style={{ color: '#55556A' }}>Loading…</Text>
          </View>
        ) : habits.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 16 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#1A1A22',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#2A2A32',
              }}
            >
              <Ionicons name="repeat-outline" size={34} color="#5B5EF4" />
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#E8E8FF', fontWeight: '600', fontSize: 16 }}>
                No habits yet
              </Text>
              <Text
                style={{
                  color: '#55556A',
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
              style={{
                backgroundColor: '#5B5EF4',
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 11,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                Add your first habit
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              todayStr={todayStr}
              last7Days={last7Days}
              isDoneToday={doneSourceIds.has(`${habit.id}_${todayStr}`)}
              isPending={pendingId === habit.id}
              onToggle={() => handleToggle(habit)}
              onEdit={() => setEditingHabit(habit)}
              onDelete={() => handleDelete(habit)}
            />
          ))
        )}
      </ScrollView>

      <XPToast />

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
