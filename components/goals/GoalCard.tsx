import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, Task } from '@/types';
import { categoryColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
}

export function GoalCard({ goal, tasks, onEdit, onDelete, onAddTask }: GoalCardProps) {
  const completed = tasks.filter((t) => t.is_completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = categoryColor(goal.category);

  return (
    <View className="bg-surface-overlay border border-border rounded-2xl p-4 gap-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1.5">
          <View className="flex-row items-center gap-2">
            <View style={{ backgroundColor: color }} className="w-2.5 h-2.5 rounded-full" />
            <Text className="text-text-primary font-semibold text-base flex-1" numberOfLines={1}>
              {goal.title}
            </Text>
          </View>
          {goal.description && (
            <Text className="text-text-secondary text-sm" numberOfLines={2}>
              {goal.description}
            </Text>
          )}
        </View>
        <View className="flex-row gap-1 ml-2">
          <TouchableOpacity onPress={onEdit} className="p-1.5">
            <Ionicons name="pencil-outline" size={16} color="#8888A0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} className="p-1.5">
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <Badge label={goal.category} color={color} />
        <Text className="text-text-secondary text-xs">
          {completed}/{total} tasks
        </Text>
        <View className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
          <View
            style={{ width: `${pct}%`, backgroundColor: color }}
            className="h-full rounded-full"
          />
        </View>
        <Text style={{ color }} className="text-xs font-semibold">
          {pct}%
        </Text>
      </View>

      <TouchableOpacity
        onPress={onAddTask}
        className="flex-row items-center gap-1.5 border border-dashed border-border rounded-xl px-3 py-2"
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={16} color="#5B5EF4" />
        <Text className="text-accent text-sm">Add task</Text>
      </TouchableOpacity>
    </View>
  );
}
