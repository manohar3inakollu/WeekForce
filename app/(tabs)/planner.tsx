import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasksForWeek, useCompleteTask, useUncompleteTask, useDeleteTask, useCreateTask } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useUIStore } from '@/store/ui';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { XPToast } from '@/components/ui/XPToast';
import { DayOfWeek, Task } from '@/types';
import { XP_AWARDS, DAYS_OF_WEEK } from '@/constants/xp';
import { todayDayLabel } from '@/lib/utils';
import { format, parseISO, addDays } from 'date-fns';
import { router } from 'expo-router';

export default function PlannerScreen() {
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: tasks = [], isLoading, refetch } = useTasksForWeek(weekStart);
  const { data: goals = [] } = useGoals(weekStart);

  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>(todayDayLabel());
  const todayLabel = todayDayLabel();

  const weekStart_date = parseISO(weekStart);

  const handleToggle = (task: Task) => {
    if (task.is_completed) {
      uncompleteTask.mutate(task.id);
    } else {
      completeTask.mutate({ task, xpAmount: XP_AWARDS.small_task });
    }
  };

  const handleAddForDay = (day: DayOfWeek) => {
    setDefaultDay(day);
    setShowTaskForm(true);
  };

  const handleCreateTask = async (data: { title: string; scheduled_day: DayOfWeek; goal_id: string }) => {
    await createTask.mutateAsync({ ...data, due_date: weekStart });
    setShowTaskForm(false);
  };

  return (
    <View className="flex-1 bg-surface">
      <XPToast />
      <View className="px-5 pt-14 pb-4 border-b border-border flex-row items-center justify-between">
        <Text className="text-text-primary text-2xl font-bold">Planner</Text>
        <TouchableOpacity
          onPress={() => setShowTaskForm(true)}
          className="bg-accent px-4 py-2 rounded-xl flex-row items-center gap-1.5"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-medium text-sm">Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {DAYS_OF_WEEK.map((day, idx) => {
          const dayTasks = tasks.filter((t) => t.scheduled_day === day);
          const dayDate = addDays(weekStart_date, idx);
          const isToday = day === todayLabel;

          return (
            <View key={day} className="border-b border-border-subtle">
              <View
                className={`px-5 py-3 flex-row items-center justify-between ${isToday ? 'bg-accent-muted' : ''}`}
              >
                <View className="flex-row items-center gap-2">
                  {isToday && (
                    <View className="w-2 h-2 rounded-full bg-accent" />
                  )}
                  <Text
                    className={`font-semibold text-base ${isToday ? 'text-accent' : 'text-text-primary'}`}
                  >
                    {day}
                  </Text>
                  <Text className="text-text-muted text-sm">
                    {format(dayDate, 'MMM d')}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="text-text-muted text-xs">
                    {dayTasks.filter((t) => t.is_completed).length}/{dayTasks.length}
                  </Text>
                  <TouchableOpacity onPress={() => handleAddForDay(day)}>
                    <Ionicons name="add-circle-outline" size={20} color="#5B5EF4" />
                  </TouchableOpacity>
                </View>
              </View>

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
                  dayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggle(task)}
                      onPress={() => router.push(`/task/${task.id}`)}
                      onDelete={() => deleteTask.mutate(task.id)}
                      showGoal
                    />
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
