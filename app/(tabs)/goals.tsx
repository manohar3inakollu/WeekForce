import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { useTasksForWeek, useCreateTask } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { TaskForm } from '@/components/tasks/TaskForm';
import { WeekNav } from '@/components/ui/WeekNav';
import { Goal, GoalCategory } from '@/types';

interface GoalFormData {
  title: string;
  description?: string;
  category: GoalCategory;
  due_date: string | null;
}

export default function GoalsScreen() {
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [], isLoading, refetch } = useGoals(weekStart);
  const { data: tasks = [] } = useTasksForWeek(weekStart);

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const createTask = useCreateTask();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [taskGoalId, setTaskGoalId] = useState<string | null>(null);

  const handleCreateGoal = async (data: GoalFormData) => {
    await createGoal.mutateAsync({ ...data, week_start: weekStart });
    setShowGoalForm(false);
  };

  const handleEditGoal = async (data: GoalFormData) => {
    if (!editingGoal) return;
    await updateGoal.mutateAsync({ id: editingGoal.id, updates: data });
    setEditingGoal(null);
  };

  const handleDeleteGoal = (goal: Goal) => {
    deleteGoal.mutate(goal.id);
  };

  const handleAddTask = async (data: { title: string; scheduled_day: any; goal_id: string | null; start_time: string | null; estimated_minutes: number; priority: any }) => {
    await createTask.mutateAsync({ ...data, due_date: weekStart });
    setTaskGoalId(null);
  };

  const taskGoal = goals.find((g) => g.id === taskGoalId) ?? null;

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-text-primary text-2xl font-bold">Goals</Text>
          <TouchableOpacity
            onPress={() => setShowGoalForm(true)}
            className="rounded-xl overflow-hidden"
          >
            <LinearGradient
              colors={['#6B6EFF', '#5B5EF4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-white font-medium text-sm">New Goal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View className="mt-2">
          <WeekNav />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {goals.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 gap-4">
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#222228' }} className="items-center justify-center border border-border">
              <Ionicons name="flag-outline" size={28} color="#55556A" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-text-primary font-semibold text-base">No goals yet</Text>
              <Text className="text-text-muted text-sm text-center">Set a goal to start tracking your progress this week.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowGoalForm(true)}
              className="rounded-xl overflow-hidden"
            >
              <LinearGradient
                colors={['#6B6EFF', '#5B5EF4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text className="text-white font-semibold">Add your first goal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              tasks={tasks.filter((t) => t.goal_id === goal.id)}
              onPress={() => router.push(`/goal/${goal.id}`)}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => handleDeleteGoal(goal)}
              onAddTask={() => setTaskGoalId(goal.id)}
            />
          ))
        )}
      </ScrollView>

      <GoalForm
        visible={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        onSubmit={handleCreateGoal}
        loading={createGoal.isPending}
        mode="create"
      />

      <GoalForm
        visible={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onSubmit={handleEditGoal}
        loading={updateGoal.isPending}
        initial={editingGoal ?? undefined}
        mode="edit"
      />

      <TaskForm
        visible={!!taskGoalId}
        onClose={() => setTaskGoalId(null)}
        onSubmit={handleAddTask}
        loading={createTask.isPending}
        goals={taskGoal ? [taskGoal] : []}
        defaultGoalId={taskGoalId ?? undefined}
      />
    </View>
  );
}
