import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTasksForWeek, useUpdateTaskStatus, useUncompleteTask, useDeleteTask, useCreateTask, useReorderTasks, useToggleRecurringTask } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useUIStore } from '@/store/ui';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { WeekNav } from '@/components/ui/WeekNav';
import { DayOfWeek, Task } from '@/types';
import { DAYS_OF_WEEK } from '@/constants/xp';
import { todayDayLabel, CAT_COLORS, isTaskOverdue } from '@/lib/utils';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { router } from 'expo-router';

const PLANNER_CATS = ['All', 'health', 'work', 'personal', 'learning', 'finance', 'other'] as const;
type PlannerCat = typeof PLANNER_CATS[number];

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
  const plannerView = useUIStore((s) => s.plannerView);
  const setPlannerView = useUIStore((s) => s.setPlannerView);
  const { data: tasks = [], isLoading, isRefetching, refetch } = useTasksForWeek(weekStart);
  const { data: goals = [] } = useGoals(weekStart);

  const updateStatus = useUpdateTaskStatus();
  const uncompleteTask = useUncompleteTask();
  const toggleRecurring = useToggleRecurringTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>(todayDayLabel());
  const [defaultDate, setDefaultDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});
  const [catFilter, setCatFilter] = useState<PlannerCat>('All');
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
    } else {
      updateStatus.mutate({ task, status: 'done' });
    }
  };

  const handleAddForDay = (day: DayOfWeek) => {
    const dayIdx = DAYS_OF_WEEK.indexOf(day);
    setDefaultDay(day);
    setDefaultDate(format(addDays(weekStart_date, dayIdx), 'yyyy-MM-dd'));
    setShowTaskForm(true);
  };

  const handleCreateTask = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync(data);
      setShowTaskForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const orderedTasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const day of DAYS_OF_WEEK) {
      let dayTasks = tasks.filter((t) => {
        const rt = t.recurrence_type ?? 'none';
        if (rt === 'daily') return true;
        if (rt === 'weekly') return t.scheduled_day === day;
        if (rt === 'custom') return t.recurrence_days?.includes(day) ?? false;
        return t.scheduled_day === day;
      });
      if (catFilter !== 'All') {
        dayTasks = dayTasks.filter((t) => (t.goal?.category ?? 'other') === catFilter);
      }
      const order = localOrder[day];
      if (order) {
        dayTasks = [...dayTasks].sort((a, b) => {
          const ai = order.indexOf(a.id);
          const bi = order.indexOf(b.id);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
      } else {
        dayTasks = [...dayTasks].sort((a, b) => {
          const aOver = isTaskOverdue(a) ? 0 : 1;
          const bOver = isTaskOverdue(b) ? 0 : 1;
          if (aOver !== bOver) return aOver - bOver;
          return (PRIORITY_RANK[a.priority ?? 'medium'] ?? 1) - (PRIORITY_RANK[b.priority ?? 'medium'] ?? 1);
        });
      }
      map[day] = dayTasks;
    }
    return map;
  }, [tasks, catFilter, localOrder]);

  const getOrderedTasks = (day: DayOfWeek) => orderedTasksByDay[day] ?? [];

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
      <View className="px-5 pt-14 pb-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text style={{ color: '#E8E8F2', fontSize: 24, fontWeight: '800' }}>Planner</Text>
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
              onPress={() => {
                const day = plannerView === 'day' ? DAYS_OF_WEEK[selectedDayIdx] : todayLabel;
                handleAddForDay(day);
              }}
              style={{ borderRadius: 12, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#6B6EFF', '#5B5EF4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Task</Text>
              </LinearGradient>
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

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' }}
        style={{ flexShrink: 0, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#252535' }}
      >
        {PLANNER_CATS.map((cat) => {
          const on = catFilter === cat;
          const col = cat === 'All' ? '#5B5EF4' : CAT_COLORS[cat];
          const selectedDayName = DAYS_OF_WEEK[selectedDayIdx];
          const chipBaseTasks = plannerView === 'day'
            ? tasks.filter((t) => {
                const rt = t.recurrence_type ?? 'none';
                if (rt === 'daily') return true;
                if (rt === 'weekly') return t.scheduled_day === selectedDayName;
                if (rt === 'custom') return t.recurrence_days?.includes(selectedDayName) ?? false;
                return t.scheduled_day === selectedDayName;
              })
            : tasks;
          const count = cat === 'All'
            ? chipBaseTasks.length
            : chipBaseTasks.filter((t) => (t.goal?.category ?? 'other') === cat).length;
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
              {cat !== 'All' && (
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

      {isLoading && !isRefetching && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5B5EF4" />
        </View>
      )}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        style={{ display: isLoading && !isRefetching ? 'none' : 'flex' }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#5B5EF4" />
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
                      <TouchableOpacity
                        onPress={() => Alert.alert('Day Load', 'Total estimated task time for this day.\n\nLight: ≤ 2 hours\nModerate: 2 – 5 hours\nHeavy: > 5 hours\n\nAdjust task durations in each task to control this.')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={{ backgroundColor: load.color + '22', borderColor: load.color + '55', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 }}
                      >
                        <Text style={{ color: load.color, fontSize: 12, fontWeight: '500' }}>{load.label}</Text>
                      </TouchableOpacity>
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
                    <TouchableOpacity
                      onPress={() => Alert.alert('Day Load', 'Total estimated task time for this day.\n\nLight: ≤ 2 hours\nModerate: 2 – 5 hours\nHeavy: > 5 hours\n\nAdjust task durations in each task to control this.')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{ backgroundColor: load.color + '22', borderColor: load.color + '55', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 }}
                    >
                      <Text style={{ color: load.color, fontSize: 12, fontWeight: '500' }}>{load.label}</Text>
                    </TouchableOpacity>
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

              <View className="px-5 pt-2 pb-3 gap-2">
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
                          onDelete={() =>
                            Alert.alert(
                              'Delete task?',
                              `"${task.title}" will be permanently removed.`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(task.id) },
                              ],
                            )
                          }
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
        defaultDate={defaultDate}
      />
    </View>
  );
}
