import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTasksForWeek, useUpdateTaskStatus, useUncompleteTask, useDeleteTask, useCreateTask, useReorderTasks, useToggleRecurringTask } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useUIStore } from '@/store/ui';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { XPToast } from '@/components/ui/XPToast';
import { WeekNav } from '@/components/ui/WeekNav';
import { DayOfWeek, Task } from '@/types';
import { DAYS_OF_WEEK } from '@/constants/xp';
import { todayDayLabel } from '@/lib/utils';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { router } from 'expo-router';

function getDayLoad(tasks: Task[]) {
  const mins = tasks.reduce((s, t) => s + (t.estimated_minutes ?? 30), 0);
  if (mins === 0) return null;
  if (mins <= 120) return { label: 'Light', color: '#22C55E' };
  if (mins <= 300) return { label: 'Moderate', color: '#F59E0B' };
  return { label: 'Heavy', color: '#EF4444' };
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function PlannerScreen() {
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const setSelectedWeekStart = useUIStore((s) => s.setSelectedWeekStart);
  const { data: tasks = [], isLoading, refetch } = useTasksForWeek(weekStart);
  const { data: goals = [] } = useGoals(weekStart);

  const updateStatus = useUpdateTaskStatus();
  const uncompleteTask = useUncompleteTask();
  const toggleRecurring = useToggleRecurringTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>(todayDayLabel());
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});
  const [plannerView, setPlannerView] = useState<'week' | 'day'>('day');
  const todayIdx = DAYS_OF_WEEK.indexOf(todayDayLabel());
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0);

  const todayLabel = todayDayLabel();
  const weekStart_date = parseISO(weekStart);

  const handleToggle = (task: Task, dateStr: string) => {
    if (task.recurrence_type !== 'none') {
      toggleRecurring.mutate({ task, dateStr });
      return;
    }
    if (task.status === 'done' || task.is_completed) {
      uncompleteTask.mutate(task.id);
    } else if (task.status === 'in_progress') {
      updateStatus.mutate({ task, status: 'done' });
    } else {
      updateStatus.mutate({ task, status: 'in_progress' });
    }
  };

  const handleAddForDay = (day: DayOfWeek) => {
    setDefaultDay(day);
    setShowTaskForm(true);
  };

  const handleCreateTask = async (data: TaskFormData) => {
    await createTask.mutateAsync({ ...data, due_date: weekStart });
    setShowTaskForm(false);
  };

  const getOrderedTasks = (day: DayOfWeek) => {
    const dayTasks = tasks.filter((t) => {
      const rt = t.recurrence_type ?? 'none';
      if (rt === 'daily') return true;
      if (rt === 'weekly') return t.scheduled_day === day;
      if (rt === 'custom') return t.recurrence_days?.includes(day) ?? false;
      return t.scheduled_day === day; // 'none'
    });
    const order = localOrder[day];
    if (!order) return dayTasks;
    return [...dayTasks].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  };

  const handleMove = (day: DayOfWeek, dayTasks: Task[], from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= dayTasks.length) return;
    const reordered = moveItem(dayTasks, from, to);
    setLocalOrder((prev) => ({ ...prev, [day]: reordered.map((t) => t.id) }));
    reorderTasks.mutate(reordered);
  };

  const goToPrevDay = () => {
    if (selectedDayIdx > 0) {
      setSelectedDayIdx((i) => i - 1);
    } else {
      setSelectedWeekStart(format(subDays(weekStart_date, 7), 'yyyy-MM-dd'));
      setSelectedDayIdx(6);
    }
  };

  const goToNextDay = () => {
    if (selectedDayIdx < 6) {
      setSelectedDayIdx((i) => i + 1);
    } else {
      setSelectedWeekStart(format(addDays(weekStart_date, 7), 'yyyy-MM-dd'));
      setSelectedDayIdx(0);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <XPToast />
      <View className="px-5 pt-14 pb-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-text-primary text-2xl font-bold">Planner</Text>
          <View className="flex-row items-center gap-2">
            <View style={{ flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 8, padding: 2 }}>
              {(['week', 'day'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setPlannerView(v)}
                  style={{
                    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6,
                    backgroundColor: plannerView === v ? '#2A2A32' : 'transparent',
                  }}
                >
                  <Text style={{ color: plannerView === v ? '#E8E8F0' : '#55556A', fontSize: 12, fontWeight: '600' }}>
                    {v === 'week' ? 'Week' : 'Day'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setShowTaskForm(true)}
              className="bg-accent px-3 py-2 rounded-xl flex-row items-center gap-1"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-white font-medium text-sm">Task</Text>
            </TouchableOpacity>
          </View>
        </View>
        {plannerView === 'week' ? (
          <View className="mt-2">
            <WeekNav />
          </View>
        ) : (
          <View className="mt-2 flex-row items-center justify-between">
            <TouchableOpacity onPress={goToPrevDay} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color="#8888A0" />
            </TouchableOpacity>
            <Text className="text-text-secondary text-sm font-medium">
              {DAYS_OF_WEEK[selectedDayIdx]} · {format(addDays(weekStart_date, selectedDayIdx), 'MMM d, yyyy')}
            </Text>
            <TouchableOpacity onPress={goToNextDay} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={20} color="#8888A0" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {(plannerView === 'week' ? DAYS_OF_WEEK : [DAYS_OF_WEEK[selectedDayIdx]]).map((day) => {
          const dayIdx = DAYS_OF_WEEK.indexOf(day);
          const dayTasks = getOrderedTasks(day);
          const dayDate = addDays(weekStart_date, dayIdx);
          const dateStr = format(dayDate, 'yyyy-MM-dd');
          const isToday = day === todayLabel;
          const load = getDayLoad(dayTasks);
          const completedCount = dayTasks.filter((t) =>
            t.recurrence_type !== 'none'
              ? (t.completed_dates?.includes(dateStr) ?? false)
              : t.is_completed
          ).length;

          return (
            <View key={day} className="border-b border-border-subtle">
              {isToday ? (
                <LinearGradient
                  colors={['#2A2B5E', '#18181C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="px-5 py-3 flex-row items-center justify-between"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-accent" />
                    <Text className="font-semibold text-base text-accent">{day}</Text>
                    <Text className="text-text-muted text-sm">{format(dayDate, 'MMM d')}</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    {load && (
                      <View
                        style={{ backgroundColor: load.color + '22', borderColor: load.color + '55', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 }}
                      >
                        <Text style={{ color: load.color, fontSize: 12, fontWeight: '500' }}>{load.label}</Text>
                      </View>
                    )}
                    <Text className="text-text-muted text-xs">
                      {completedCount}/{dayTasks.length}
                    </Text>
                    <TouchableOpacity onPress={() => handleAddForDay(day)}>
                      <Ionicons name="add-circle-outline" size={20} color="#5B5EF4" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ) : (
              <View className="px-5 py-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold text-base text-text-primary">{day}</Text>
                  <Text className="text-text-muted text-sm">{format(dayDate, 'MMM d')}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  {load && (
                    <View
                      style={{ backgroundColor: load.color + '22', borderColor: load.color + '55', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 }}
                    >
                      <Text style={{ color: load.color, fontSize: 12, fontWeight: '500' }}>{load.label}</Text>
                    </View>
                  )}
                  <Text className="text-text-muted text-xs">
                    {completedCount}/{dayTasks.length}
                  </Text>
                  <TouchableOpacity onPress={() => handleAddForDay(day)}>
                    <Ionicons name="add-circle-outline" size={20} color="#5B5EF4" />
                  </TouchableOpacity>
                </View>
              </View>
              )}

              <View className="px-5 pb-3 gap-2">
                {dayTasks.length === 0 ? (
                  <TouchableOpacity
                    onPress={() => handleAddForDay(day)}
                    className="border border-dashed border-border rounded-xl px-3 py-2.5 items-center"
                    activeOpacity={0.6}
                  >
                    <Text className="text-text-muted text-sm">+ Add task</Text>
                  </TouchableOpacity>
                ) : (
                  dayTasks.map((task, index) => (
                    <View key={task.id} className="flex-row items-center gap-1">
                      <View className="flex-1">
                        <TaskCard
                          task={task}
                          onToggle={() => handleToggle(task, dateStr)}
                          onPress={() => router.push(`/task/${task.id}`)}
                          onDelete={() => deleteTask.mutate(task.id)}
                          showGoal
                          isCompletedOverride={
                            task.recurrence_type !== 'none'
                              ? (task.completed_dates?.includes(dateStr) ?? false)
                              : undefined
                          }
                        />
                      </View>
                      <View className="gap-1">
                        <TouchableOpacity
                          onPress={() => handleMove(day, dayTasks, index, -1)}
                          disabled={index === 0}
                          className="p-1"
                        >
                          <Ionicons
                            name="chevron-up"
                            size={14}
                            color={index === 0 ? '#2A2A32' : '#55556A'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleMove(day, dayTasks, index, 1)}
                          disabled={index === dayTasks.length - 1}
                          className="p-1"
                        >
                          <Ionicons
                            name="chevron-down"
                            size={14}
                            color={index === dayTasks.length - 1 ? '#2A2A32' : '#55556A'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TaskForm
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={handleCreateTask}
        loading={createTask.isPending}
        goals={goals}
        defaultDay={defaultDay}
      />
    </View>
  );
}
