import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { Milestone } from '@/types';
import { categoryColor, isDateOverdue } from '@/lib/utils';
import { MILESTONE_XP_BY_DIFFICULTY } from '@/constants/xp';

interface MilestoneCardProps {
  milestone: Milestone;
  onEdit: () => void;
  onDelete: () => void;
  onPress?: () => void;
  linkedGoalCount?: number;
}

export function MilestoneCard({ milestone, onEdit, onDelete, onPress, linkedGoalCount }: MilestoneCardProps) {
  const color = categoryColor(milestone.category);
  const isCompleted = milestone.status === 'completed';
  const xp = MILESTONE_XP_BY_DIFFICULTY[milestone.difficulty] ?? 1000;

  const startValid = !!milestone.start_date && isValid(parseISO(milestone.start_date));
  const dueValid = !!milestone.due_date && isValid(parseISO(milestone.due_date));

  let timelinePercent = 0;
  let daysLeft = 0;
  if (startValid && dueValid && !isCompleted) {
    const start = parseISO(milestone.start_date!);
    const end = parseISO(milestone.due_date!);
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(new Date(), start);
    timelinePercent = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    daysLeft = Math.max(0, differenceInDays(end, new Date()));
  }

  const isOverdue = !isCompleted && isDateOverdue(milestone.due_date);
  const showTimeline = !isCompleted && startValid && dueValid;
  const activeColor = isCompleted ? '#22C55E' : color;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.85 : 1} disabled={!onPress}>
      <LinearGradient
        colors={[color + '1A', '#13131e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isCompleted ? '#22C55E44' : color + '44',
          overflow: 'hidden',
          opacity: isCompleted ? 0.85 : 1,
        }}
      >
        <View style={{ padding: 16, gap: 10 }}>
          {/* Header row — mirrors GoalCard layout */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {/* Left: title + badges + dates */}
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{
                  color: isCompleted ? '#8888AA' : '#E8E8F2',
                  fontWeight: '700',
                  fontSize: 15,
                  lineHeight: 20,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                }}
                numberOfLines={2}
              >
                {milestone.title}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                  backgroundColor: (isCompleted ? '#44445A' : color) + '18',
                  borderWidth: 1, borderColor: (isCompleted ? '#44445A' : color) + '33',
                }}>
                  <Text style={{ color: isCompleted ? '#55556A' : color, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>
                    {milestone.category}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: '#252535' }}>
                  <Text style={{ color: '#55556A', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                    {milestone.difficulty}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#A855F715' }}>
                  <Text style={{ color: '#A855F7', fontSize: 10, fontWeight: '700' }}>{xp} XP</Text>
                </View>
                {linkedGoalCount !== undefined && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#22C55E15', borderWidth: 1, borderColor: '#22C55E33' }}>
                    <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '700' }}>{linkedGoalCount} {linkedGoalCount === 1 ? 'goal' : 'goals'}</Text>
                  </View>
                )}
                {isOverdue && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#EF444418', borderWidth: 1, borderColor: '#EF444433' }}>
                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>Overdue</Text>
                  </View>
                )}
              </View>

              {(startValid || dueValid) && (
                <Text style={{ color: '#55556A', fontSize: 11 }}>
                  {startValid ? format(parseISO(milestone.start_date!), 'MMM d') : '—'}
                  {' → '}
                  {dueValid ? format(parseISO(milestone.due_date!), 'MMM d, yyyy') : '—'}
                </Text>
              )}
            </View>

            {/* Right: status badge + edit + delete */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              {isCompleted && (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <TouchableOpacity onPress={onEdit} style={{ padding: 5 }}>
                <Ionicons name="pencil-outline" size={14} color="#8888A0" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={{ padding: 5 }}>
                <Ionicons name="trash-outline" size={14} color="#F87171" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Timeline bar */}
          {showTimeline && (
            <View style={{ gap: 5 }}>
              <View style={{ height: 4, backgroundColor: '#252535', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${timelinePercent}%` as any, height: '100%', backgroundColor: color, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#55556A', fontSize: 10 }}>{Math.round(timelinePercent)}% elapsed</Text>
                <Text style={{ color: daysLeft === 0 ? '#F87171' : '#8888AA', fontSize: 10, fontWeight: '600' }}>
                  {daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
