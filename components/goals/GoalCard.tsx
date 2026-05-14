import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Goal, Task } from '@/types';
import { categoryColor, DIFFICULTY_COLORS, isDateOverdue } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { format, parseISO, isValid } from 'date-fns';
import { GOAL_XP_BY_DIFFICULTY } from '@/constants/xp';

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  onPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, tasks, onPress, onEdit, onDelete }: GoalCardProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const completed = tasks.filter((t) =>
    t.recurrence_type !== 'none'
      ? (t.completed_dates?.includes(todayStr) ?? false)
      : t.is_completed
  ).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = categoryColor(goal.category);
  const dueDateValid = goal.due_date && isValid(parseISO(goal.due_date));
  const isOverdue = goal.status === 'active' && isDateOverdue(goal.due_date);
  const isDone = goal.status === 'completed';
  const diffColor = DIFFICULTY_COLORS[goal.difficulty ?? 'medium'];
  const xp = GOAL_XP_BY_DIFFICULTY[goal.difficulty ?? 'medium'];

  const gradientColor = isDone ? '#22C55E' : color;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{ borderRadius: 16, overflow: 'hidden', opacity: isDone ? 0.8 : 1 }}
    >
      <LinearGradient
        colors={[gradientColor + '28', gradientColor + '08', '#13131e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.4, y: 1 }}
        style={{
          borderWidth: 1,
          borderLeftWidth: 4,
          borderColor: gradientColor + '44',
          borderLeftColor: gradientColor,
          borderRadius: 16,
          padding: 16,
          gap: 12,
        }}
      >
      <View style={{ gap: 12 }}>
        {/* Header row */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 gap-1">
            <Text
              className="text-text-primary font-semibold text-base flex-1"
              numberOfLines={1}
              style={isDone ? { textDecorationLine: 'line-through', color: '#55556A' } : undefined}
            >
              {goal.title}
            </Text>
            {goal.description && (
              <Text className="text-text-secondary text-sm" numberOfLines={2}>
                {goal.description}
              </Text>
            )}
          </View>
          <View className="flex-row gap-1 ml-2" style={{ alignItems: 'center' }}>
            {isDone && (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
            <TouchableOpacity onPress={onEdit} className="p-1.5">
              <Ionicons name="pencil-outline" size={16} color="#8888A0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} className="p-1.5">
              <Ionicons name="trash-outline" size={16} color="#F87171" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Badges + task count */}
        <View className="flex-row items-center gap-2 flex-wrap">
          <Badge label={goal.category} color={color} />
          <Badge label={goal.difficulty ?? 'medium'} color={diffColor} />
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#A855F715' }}>
            <Text style={{ color: '#A855F7', fontSize: 10, fontWeight: '700' }}>+{xp} XP</Text>
          </View>
          {isDone && <Badge label="Completed" color="#22C55E" />}
          {isOverdue && !isDone && <Badge label="Overdue" color="#EF4444" />}
          {!isDone && !isOverdue && dueDateValid && (
            <Badge label={`Due ${format(parseISO(goal.due_date!), 'MMM d')}`} color="#8888A0" />
          )}
          <Text className="text-text-secondary text-xs ml-auto">
            {completed}/{total} tasks
          </Text>
        </View>

        {/* Progress bar */}
        <View>
          <View style={{ borderRadius: 4, overflow: 'hidden' }} className="h-2 bg-surface-raised">
            <View style={{ width: `${pct}%`, backgroundColor: isDone ? '#22C55E' : color }} className="h-full" />
          </View>
          <Text style={{ color: isDone ? '#22C55E' : color }} className="text-xs font-semibold mt-1 text-right">
            {pct}%
          </Text>
        </View>
      </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
