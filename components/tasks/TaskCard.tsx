import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority } from '@/types';
import { TASK_XP_BY_DIFFICULTY, DIFFICULTIES } from '@/constants/xp';
import { categoryColor, formatTime, isTaskOverdue } from '@/lib/utils';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  onUnassign?: () => void;
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
  onUnassign,
  onLongPress,
  isActive,
  showGoal,
  isCompletedOverride,
}: TaskCardProps) {
  const goalColor = task.goal ? categoryColor(task.goal.category) : '#5B5EF4';
  const priorityColor = PRIORITY_COLOR[task.priority ?? 'medium'];
  const diff = DIFFICULTIES.find((d) => d.value === (task.difficulty ?? 'medium'));
  const diffColor = diff?.color ?? '#F59E0B';
  const isDone = isCompletedOverride !== undefined
    ? isCompletedOverride
    : (task.status === 'done' || task.is_completed);
  const isInProgress = isCompletedOverride === undefined && task.status === 'in_progress';
  const isOverdue = isTaskOverdue(task, isDone);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: (isDone ? '#44445A' : priorityColor) + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isDone ? '#44445A' : priorityColor }} />
            <Text style={{ color: isDone ? '#44445A' : priorityColor, fontSize: 9, fontWeight: '700' }}>
              {(task.priority ?? 'medium').charAt(0).toUpperCase() + (task.priority ?? 'medium').slice(1)}
            </Text>
          </View>
          {task.start_time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <Ionicons name="time-outline" size={10} color="#55556A" />
              <Text style={{ color: '#55556A', fontSize: 10 }}>{formatTime(task.start_time)}</Text>
            </View>
          )}
          {task.estimated_minutes && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <Ionicons name="timer-outline" size={10} color="#55556A" />
              <Text style={{ color: '#55556A', fontSize: 10 }}>
                {task.estimated_minutes < 60 ? `${task.estimated_minutes}m` : `${task.estimated_minutes / 60}h`}
              </Text>
            </View>
          )}
          {showGoal && task.goal && (
            <Text style={{ color: goalColor, fontSize: 10, flexShrink: 1 }} numberOfLines={1}>
              {task.goal.title}
            </Text>
          )}
          {isInProgress && (
            <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '700', flexShrink: 0 }}>In progress</Text>
          )}
          {isOverdue && (
            <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '700', flexShrink: 0 }}>Overdue</Text>
          )}
        </View>
      </View>

      {/* Right side */}
      <View className="flex-row items-center gap-2">
        <View style={{ backgroundColor: isDone ? '#44445A18' : diffColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: isDone ? '#44445A' : diffColor, fontSize: 9, fontWeight: '700' }}>
            {isDone ? '✓ ' : '+'}{TASK_XP_BY_DIFFICULTY[task.difficulty ?? 'medium']} XP
          </Text>
        </View>
        {onUnassign && (
          <TouchableOpacity onPress={onUnassign} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="unlink-outline" size={14} color="#55556A" />
          </TouchableOpacity>
        )}
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
