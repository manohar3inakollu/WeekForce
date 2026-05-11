import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import { useGoal, useUpdateGoal, useUpdateGoalStatus, useDeleteGoal } from '@/hooks/useGoals';
import { useTasksForGoal, useCreateTask, useUpdateTaskStatus, useUncompleteTask, useDeleteTask } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { GoalForm } from '@/components/goals/GoalForm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { XPToast } from '@/components/ui/XPToast';
import { Task, GoalCategory, Difficulty } from '@/types';
import { categoryColor } from '@/lib/utils';
import { GOAL_XP_BY_DIFFICULTY } from '@/constants/xp';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: goal, isLoading } = useGoal(id);
  const { data: tasks = [] } = useTasksForGoal(id);

  const updateGoal = useUpdateGoal();
  const updateGoalStatus = useUpdateGoalStatus();
  const deleteGoal = useDeleteGoal();
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const uncompleteTask = useUncompleteTask();
  const deleteTask = useDeleteTask();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const handleEdit = async (data: {
    title: string;
    description?: string;
    category: GoalCategory;
    due_date: string | null;
    difficulty: Difficulty;
  }) => {
    await updateGoal.mutateAsync({ id, updates: data });
    setShowEditForm(false);
  };

  const handleDelete = () => {
    deleteGoal.mutate(id);
    router.back();
  };

  const handleAddTask = async (data: TaskFormData) => {
    await createTask.mutateAsync({ ...data, due_date: goal?.week_start });
    setShowTaskForm(false);
  };

  const handleToggleGoal = () => {
    if (!goal) return;
    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    updateGoalStatus.mutate({ goal, status: newStatus });
  };

  const handleToggleTask = (task: Task) => {
    if (task.status === 'done' || task.is_completed) {
      uncompleteTask.mutate(task.id);
    } else if (task.status === 'in_progress') {
      updateStatus.mutate({ task, status: 'done' });
    } else {
      updateStatus.mutate({ task, status: 'in_progress' });
    }
  };

  if (isLoading || !goal) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <Text className="text-text-secondary">Loading...</Text>
      </View>
    );
  }

  const color = categoryColor(goal.category);
  const completed = tasks.filter((t) => t.is_completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const dueDateValid = goal.due_date && isValid(parseISO(goal.due_date));

  return (
    <View className="flex-1 bg-surface">
      <XPToast />

      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={20} color="#5B5EF4" />
          <Text className="text-accent text-base">Back</Text>
        </TouchableOpacity>
        <View className="flex-row gap-1">
          <TouchableOpacity onPress={() => setShowEditForm(true)} className="p-2">
            <Ionicons name="pencil-outline" size={20} color="#8888A0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} className="p-2">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
        {/* Title */}
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <View style={{ backgroundColor: color }} className="w-3 h-3 rounded-full" />
            <Text className="text-text-primary text-2xl font-bold flex-1">{goal.title}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Badge label={goal.category} color={color} />
            {dueDateValid && (
              <Badge label={`Due ${format(parseISO(goal.due_date!), 'MMM d, yyyy')}`} color="#8888A0" />
            )}
            <Badge
              label={goal.status === 'completed' ? 'Completed' : 'Active'}
              color={goal.status === 'completed' ? '#22C55E' : '#5B5EF4'}
            />
          </View>
        </View>

        {/* Description */}
        {goal.description ? (
          <View className="bg-surface-overlay border border-border rounded-xl p-4">
            <Text className="text-text-secondary text-sm leading-5">{goal.description}</Text>
          </View>
        ) : null}

        {/* Progress */}
        <View className="bg-surface-overlay border border-border rounded-xl p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-muted text-xs font-medium">Progress</Text>
            <Text className="text-text-secondary text-xs">{completed}/{total} tasks done</Text>
          </View>
          <View className="h-2 bg-surface-raised rounded-full overflow-hidden">
            <View
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="h-full rounded-full"
            />
          </View>
          <Text style={{ color }} className="text-sm font-semibold">{pct}% complete</Text>
        </View>

        {/* Tasks */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary font-semibold text-base">Tasks</Text>
            <TouchableOpacity
              onPress={() => setShowTaskForm(true)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="add-circle-outline" size={18} color="#5B5EF4" />
              <Text className="text-accent text-sm">Add task</Text>
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowTaskForm(true)}
              className="border border-dashed border-border rounded-xl px-4 py-5 items-center"
              activeOpacity={0.6}
            >
              <Text className="text-text-muted text-sm">No tasks yet — tap to add one</Text>
            </TouchableOpacity>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task)}
                onPress={() => router.push(`/task/${task.id}`)}
                onDelete={() => deleteTask.mutate(task.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="px-5 pb-10 pt-4 border-t border-border">
        <Button
          label={goal.status === 'completed'
            ? 'Mark as active'
            : `Complete goal · +${GOAL_XP_BY_DIFFICULTY[goal.difficulty ?? 'medium']} XP`}
          onPress={handleToggleGoal}
          variant={goal.status === 'completed' ? 'secondary' : 'primary'}
          loading={updateGoalStatus.isPending}
          fullWidth
          size="lg"
        />
      </View>

      <GoalForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleEdit}
        loading={updateGoal.isPending}
        initial={goal}
        mode="edit"
      />

      <TaskForm
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={handleAddTask}
        loading={createTask.isPending}
        goals={[goal]}
        defaultGoalId={goal.id}
      />
    </View>
  );
}
