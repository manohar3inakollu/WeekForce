import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';
import { XP_AWARDS } from '@/constants/xp';
import { categoryColor } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  showGoal?: boolean;
}

export function TaskCard({ task, onToggle, onPress, onDelete, showGoal }: TaskCardProps) {
  const goalColor = task.goal ? categoryColor(task.goal.category) : '#5B5EF4';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-surface-raised border border-border rounded-xl px-3 py-2.5 flex-row items-center gap-3"
    >
      <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View
          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${task.is_completed ? 'bg-success border-success' : 'border-border'}`}
        >
          {task.is_completed && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      </TouchableOpacity>

      <View className="flex-1 gap-0.5">
        <Text
          className={`text-sm font-medium ${task.is_completed ? 'text-text-muted line-through' : 'text-text-primary'}`}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {showGoal && task.goal && (
          <Text style={{ color: goalColor }} className="text-xs" numberOfLines={1}>
            {task.goal.title}
          </Text>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        <Text className="text-xp text-xs font-medium">+{XP_AWARDS.small_task} XP</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={14} color="#55556A" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
