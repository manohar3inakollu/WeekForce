import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, Task } from '@/types';
import { categoryColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { format, parseISO, isValid } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  onPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
}

export function GoalCard({ goal, tasks, onPress, onEdit, onDelete, onAddTask }: GoalCardProps) {
  const completed = tasks.filter((t) => t.is_completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = categoryColor(goal.category);
  const dueDateValid = goal.due_date && isValid(parseISO(goal.due_date));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      className="bg-surface-overlay border border-border rounded-2xl overflow-hidden"
    >
      <View className="p-4 gap-3">
        {/* Header row */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 gap-1">
            <Text className="text-text-primary font-semibold text-base flex-1" numberOfLines={1}>
              {goal.title}
            </Text>
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

        {/* Badges + task count */}
        <View className="flex-row items-center gap-2 flex-wrap">
          <Badge label={goal.category} color={color} />
          {dueDateValid && (
            <Badge label={`Due ${format(parseISO(goal.due_date!), 'MMM d')}`} color="#8888A0" />
          )}
          <Text className="text-text-secondary text-xs ml-auto">
            {completed}/{total} tasks
          </Text>
        </View>

        {/* Progress bar */}
        <View>
          <View
            style={{ borderRadius: 4, overflow: 'hidden' }}
            className="h-2 bg-surface-raised"
          >
            <View
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="h-full"
            />
          </View>
          <Text style={{ color }} className="text-xs font-semibold mt-1 text-right">
            {pct}%
          </Text>
        </View>

        {/* Add task button */}
        <TouchableOpacity
          onPress={onAddTask}
          className="flex-row items-center gap-1.5 border border-dashed border-border rounded-xl px-3 py-2"
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={16} color="#5B5EF4" />
          <Text className="text-accent text-sm">Add task</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
