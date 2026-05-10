import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { useTasksForWeek, useCreateTask } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { TaskForm } from '@/components/tasks/TaskForm';
import { Goal, GoalCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { getWeekStart } from '@/lib/utils';

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

  const handleCreateGoal = async (data: { title: string; description?: string; category: GoalCategory }) => {
    await createGoal.mutateAsync({ ...data, week_start: weekStart });
    setShowGoalForm(false);
  };

  const handleEditGoal = async (data: { title: string; description?: string; category: GoalCategory }) => {
    if (!editingGoal) return;
    await updateGoal.mutateAsync({ id: editingGoal.id, updates: data });
    setEditingGoal(null);
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert('Delete Goal', `Delete "${goal.title}" and all its tasks?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteGoal.mutate(goal.id),
      },
    ]);
  };

  const handleAddTask = async (data: { title: string; scheduled_day: any; goal_id: string }) => {
    await createTask.mutateAsync({ ...data, due_date: weekStart });
    setTaskGoalId(null);
  };

  const taskGoal = goals.find((g) => g.id === taskGoalId) ?? null;

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-border">
        <View>
          <Text className="text-text-primary text-2xl font-bold">Goals</Text>
          <Text className="text-text-secondary text-sm">
            Week of {format(parseISO(weekStart), 'MMM d, yyyy')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowGoalForm(true)}
          className="bg-accent px-4 py-2 rounded-xl flex-row items-center gap-1.5"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-medium text-sm">New Goal</Text>
        </TouchableOpacity>
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
            <Ionicons name="flag-outline" size={48} color="#2A2A32" />
            <Text className="text-text-muted text-base text-center">No goals yet this week.</Text>
            <TouchableOpacity
              onPress={() => setShowGoalForm(true)}
              className="bg-accent px-5 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Add your first goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              tasks={tasks.filter((t) => t.goal_id === goal.id)}
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
