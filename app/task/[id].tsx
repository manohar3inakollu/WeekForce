import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types';
import { useCompleteTask, useUncompleteTask, useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useUIStore } from '@/store/ui';
import { TASK_XP_BY_DIFFICULTY } from '@/constants/xp';
import { categoryColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Task;
    },
    enabled: !!id,
  });

  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [] } = useGoals(task?.due_date ?? weekStart);
  const [showEditForm, setShowEditForm] = useState(false);

  const xpAmount = TASK_XP_BY_DIFFICULTY[task?.difficulty ?? 'medium'];

  const handleToggle = () => {
    if (!task) return;
    if (task.is_completed) {
      uncompleteTask.mutate(task.id);
    } else {
      completeTask.mutate({ task, xpAmount });
    }
  };

  const handleDelete = () => {
    deleteTask.mutate(task!.id);
    router.back();
  };

  const handleEdit = async (data: TaskFormData) => {
    if (!task) return;
    await updateTask.mutateAsync({ id: task.id, updates: data });
    setShowEditForm(false);
  };

  if (isLoading || !task) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <Text className="text-text-secondary">Loading...</Text>
      </View>
    );
  }

  const goalColor = task.goal ? categoryColor(task.goal.category) : '#5B5EF4';

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-down" size={20} color="#5B5EF4" />
          <Text className="text-accent text-base">Close</Text>
        </TouchableOpacity>
        <View className="flex-row gap-1">
          <TouchableOpacity onPress={() => setShowEditForm(true)} className="p-1">
            <Ionicons name="pencil-outline" size={20} color="#8888A0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} className="p-1">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ gap: 20 }}>
        <View className="gap-2">
          <Text className="text-text-primary text-2xl font-bold">{task.title}</Text>
          <View className="flex-row items-center gap-2">
            <Badge label={task.scheduled_day} color="#5B5EF4" />
            {task.is_completed && <Badge label="Completed" color="#22C55E" />}
          </View>
        </View>

        {task.goal && (
          <View className="bg-surface-overlay border border-border rounded-xl p-4 gap-2">
            <Text className="text-text-muted text-xs">Linked goal</Text>
            <View className="flex-row items-center gap-2">
              <View style={{ backgroundColor: goalColor }} className="w-2.5 h-2.5 rounded-full" />
              <Text style={{ color: goalColor }} className="font-medium text-base">
                {task.goal.title}
              </Text>
            </View>
            {task.goal.description && (
              <Text className="text-text-secondary text-sm">{task.goal.description}</Text>
            )}
          </View>
        )}

        <View className="bg-surface-overlay border border-border rounded-xl p-4 gap-3">
          <View className="flex-row justify-between">
            <View className="gap-1">
              <Text className="text-text-muted text-xs">XP reward</Text>
              <Text className="text-xp font-bold text-xl">+{xpAmount} XP</Text>
            </View>
            <View className="gap-1">
              <Text className="text-text-muted text-xs">Difficulty</Text>
              <Text className="font-semibold text-base text-text-secondary capitalize">
                {task.difficulty ?? 'medium'}
              </Text>
            </View>
            <View className="gap-1">
              <Text className="text-text-muted text-xs">Status</Text>
              <Text
                className={`font-semibold text-base ${task.is_completed ? 'text-success' : 'text-text-secondary'}`}
              >
                {task.is_completed ? 'Done' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pb-10 pt-4 border-t border-border">
        <Button
          label={task.is_completed ? 'Mark as incomplete' : `Mark complete · +${xpAmount} XP`}
          onPress={handleToggle}
          variant={task.is_completed ? 'secondary' : 'primary'}
          loading={completeTask.isPending || uncompleteTask.isPending}
          fullWidth
          size="lg"
        />
      </View>

      <TaskForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleEdit}
        loading={updateTask.isPending}
        goals={goals}
        mode="edit"
        initial={{
          title: task.title,
          scheduled_day: task.scheduled_day,
          goal_id: task.goal_id,
          start_time: task.start_time,
          estimated_minutes: task.estimated_minutes,
          priority: task.priority,
          difficulty: task.difficulty,
          recurrence_type: task.recurrence_type,
          recurrence_days: task.recurrence_days,
        }}
      />
    </View>
  );
}
