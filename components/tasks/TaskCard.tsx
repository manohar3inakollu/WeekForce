import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority } from '@/types';
import { TASK_XP_BY_DIFFICULTY } from '@/constants/xp';
import { categoryColor } from '@/lib/utils';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
  isActive?: boolean;
  showGoal?: boolean;
  isCompletedOverride?: boolean;
}

export function TaskCard({
  task,
  onToggle,
  onPress,
  onDelete,
  onLongPress,
  isActive,
  showGoal,
  isCompletedOverride,
}: TaskCardProps) {
  const goalColor = task.goal ? categoryColor(task.goal.category) : '#5B5EF4';
  const priorityColor = PRIORITY_COLOR[task.priority ?? 'medium'];
  const isDone = isCompletedOverride !== undefined
    ? isCompletedOverride
    : (task.status === 'done' || task.is_completed);
  const isInProgress = isCompletedOverride === undefined && task.status === 'in_progress';

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      activeOpacity={0.7}
      style={{ opacity: isActive ? 0.85 : 1, borderLeftWidth: 3, borderLeftColor: priorityColor }}
      className="bg-surface-raised border border-border rounded-xl overflow-hidden flex-row items-center gap-3 px-3 py-2.5"
    >
      {/* Status toggle */}
      <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View
          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
            isDone
              ? 'bg-success border-success'
              : isInProgress
              ? 'border-warning'
              : 'border-border'
          }`}
        >
          {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
          {isInProgress && <View className="w-2 h-2 rounded-full bg-warning" />}
        </View>
      </TouchableOpacity>

      {/* Content */}
      <View className="flex-1 gap-0.5">
        <Text
          className={`text-sm font-medium flex-1 ${isDone ? 'text-text-muted line-through' : 'text-text-primary'}`}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View className="flex-row items-center gap-2">
          {task.start_time && (
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="time-outline" size={10} color="#55556A" />
              <Text className="text-text-muted text-xs">{formatTime(task.start_time)}</Text>
            </View>
          )}
          {task.estimated_minutes && (
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="timer-outline" size={10} color="#55556A" />
              <Text className="text-text-muted text-xs">
                {task.estimated_minutes < 60
                  ? `${task.estimated_minutes}m`
                  : `${task.estimated_minutes / 60}h`}
              </Text>
            </View>
          )}
          {showGoal && task.goal && (
            <Text style={{ color: goalColor }} className="text-xs" numberOfLines={1}>
              {task.goal.title}
            </Text>
          )}
          {isInProgress && (
            <Text className="text-warning text-xs font-medium">In progress</Text>
          )}
        </View>
      </View>

      {/* Right side */}
      <View className="flex-row items-center gap-2">
        <Text className="text-xp text-xs font-medium">+{TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium']} XP</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={14} color="#55556A" />
          </TouchableOpacity>
        )}
        {onLongPress && (
          <Ionicons name="reorder-three-outline" size={16} color="#55556A" />
        )}
      </View>
    </TouchableOpacity>
  );
}
