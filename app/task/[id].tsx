import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Task, Goal } from '@/types';
import { useUpdateTaskStatus, useUncompleteTask, useDeleteTask, useUpdateTask, useToggleRecurringTask } from '@/hooks/useTasks';
import { useAllGoalsFull } from '@/hooks/useGoals';
import { useMilestones } from '@/hooks/useMilestones';
import { TASK_XP_BY_DIFFICULTY, DAYS_OF_WEEK } from '@/constants/xp';
import { categoryColor, PRIORITY_COLORS, DIFFICULTY_COLORS, formatTime } from '@/lib/utils';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';

function MetaCell({ icon, label, value, color, onPress }: { icon: string; label: string; value: string; color?: string; onPress?: () => void }) {
  const inner = (
    <View style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12 }}>
      <Ionicons name={icon as any} size={16} color={color ?? '#44445A'} />
      <Text style={{ color: color ?? '#E8E8F2', fontWeight: '700', fontSize: 13 }}>{value}</Text>
      <Text style={{ color: '#44445A', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>{inner}</TouchableOpacity>;
  }
  return inner;
}

export default function TaskDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const session = useAuthStore((s) => s.session);
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(*)')
        .eq('id', id)
        .eq('user_id', session!.user.id)
        .single();
      if (error) throw error;
      return data as Task;
    },
    enabled: !!id && !!session,
  });

  const updateStatus     = useUpdateTaskStatus();
  const uncompleteTask   = useUncompleteTask();
  const toggleRecurring  = useToggleRecurringTask();
  const deleteTask       = useDeleteTask();
  const updateTask       = useUpdateTask();
  const { data: allGoals = [] }   = useAllGoalsFull();
  const { data: milestones = [] } = useMilestones();

  const [showEditForm,      setShowEditForm]      = useState(false);
  const [showGoalPicker,    setShowGoalPicker]    = useState(false);

  const xpAmount = TASK_XP_BY_DIFFICULTY[task?.difficulty ?? 'medium'];

  const linkedMilestone = task?.goal
    ? milestones.find((m) => m.id === (task.goal as Goal).milestone_id) ?? null
    : null;

  const handleToggle = () => {
    if (!task) return;
    if (task.recurrence_type !== 'none') {
      toggleRecurring.mutate({ task, dateStr: format(new Date(), 'yyyy-MM-dd') });
    } else if (task.is_completed) {
      uncompleteTask.mutate(task.id);
    } else {
      updateStatus.mutate({ task, status: 'done' });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete task?',
      `"${task!.title}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { deleteTask.mutate(task!.id); router.back(); },
        },
      ],
    );
  };

  const handleEdit = async (data: TaskFormData) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, updates: data });
      setShowEditForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleReassignGoal = async (goalId: string | null) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { goal_id: goalId } });
      setShowGoalPicker(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  if (isLoading || !task) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b14', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#44445A', fontSize: 14 }}>Loading…</Text>
      </View>
    );
  }

  const todayStr    = format(new Date(), 'yyyy-MM-dd');
  const jsDay       = new Date().getDay();
  const todayLabel  = DAYS_OF_WEEK[jsDay === 0 ? 6 : jsDay - 1];
  const isScheduledToday = task.recurrence_type === 'none'
    || task.recurrence_type === 'daily'
    || (task.recurrence_type === 'weekly' && task.scheduled_day === todayLabel)
    || (task.recurrence_type === 'custom' && (task.recurrence_days?.includes(todayLabel) ?? false));
  const isCompleted = task.recurrence_type !== 'none'
    ? (task.completed_dates?.includes(todayStr) ?? false)
    : task.is_completed;
  const goalColor  = task.goal ? categoryColor((task.goal as Goal).category) : '#5B5EF4';
  const priColor   = PRIORITY_COLORS[task.priority ?? 'medium'];
  const diffColor  = DIFFICULTY_COLORS[task.difficulty ?? 'medium'];

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b14' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#252535' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={20} color="#5B5EF4" />
          <Text style={{ color: '#5B5EF4', fontSize: 15, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={() => setShowEditForm(true)} style={{ padding: 8, borderRadius: 10, backgroundColor: '#13131e' }}>
            <Ionicons name="pencil-outline" size={18} color="#8888AA" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={{ padding: 8, borderRadius: 10, backgroundColor: '#13131e' }}>
            <Ionicons name="trash-outline" size={18} color="#F87171" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero */}
        <LinearGradient
          colors={isCompleted ? ['#0e1a14', '#0b0b14'] : ['#18163a', '#0b0b14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 12 }}
        >
          {/* Hierarchy breadcrumb: Milestone → Goal */}
          {(linkedMilestone || task.goal) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {linkedMilestone && (
                <>
                  <TouchableOpacity onPress={() => router.push(`/milestone/${linkedMilestone.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="trophy-outline" size={11} color="#5B5EF4" />
                    <Text style={{ color: '#5B5EF4', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{linkedMilestone.title}</Text>
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={11} color="#44445A" />
                </>
              )}
              {task.goal && (
                <TouchableOpacity onPress={() => router.push(`/goal/${(task.goal as Goal).id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="flag-outline" size={11} color={goalColor} />
                  <Text style={{ color: goalColor, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{(task.goal as Goal).title}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Status + priority chip row */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: priColor + '18', borderWidth: 1, borderColor: priColor + '44' }}>
              <Text style={{ color: priColor, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{task.priority ?? 'medium'} priority</Text>
            </View>
            {isCompleted && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#22C55E18', borderWidth: 1, borderColor: '#22C55E44' }}>
                <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '700' }}>Completed</Text>
              </View>
            )}
          </View>

          <Text style={{ color: isCompleted ? '#8888AA' : '#E8E8F2', fontSize: 26, fontWeight: '800', lineHeight: 32, textDecorationLine: isCompleted ? 'line-through' : 'none' }}>
            {task.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => Alert.alert('Task XP', `Completing this task awards +${xpAmount} XP. The amount is based on difficulty.\n\nEasy: 5 XP · Medium: 10 XP · Hard: 25 XP · Epic: 50 XP`)}
              activeOpacity={0.8}
              style={{ backgroundColor: '#A855F720', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Text style={{ color: '#A855F7', fontWeight: '800', fontSize: 16 }}>+{xpAmount} XP</Text>
              <Ionicons name="information-circle-outline" size={13} color="#A855F766" />
            </TouchableOpacity>
            {task.start_time && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#13131e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#252535' }}>
                <Ionicons name="time-outline" size={13} color="#8888AA" />
                <Text style={{ color: '#8888AA', fontSize: 12, fontWeight: '600' }}>
                  {formatTime(task.start_time!)}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {/* Metadata grid */}
          <View style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16 }}>
            <View style={{ flexDirection: 'row' }}>
              <MetaCell
                icon="calendar-outline" label="Day" value={task.scheduled_day ?? '—'}
                onPress={() => Alert.alert('Scheduled Day', 'The day of the week this task is scheduled for. For one-off tasks this is derived from the due date.')}
              />
              <View style={{ width: 1, backgroundColor: '#252535' }} />
              <MetaCell
                icon="flame-outline" label="Difficulty" value={task.difficulty ?? 'medium'} color={diffColor}
                onPress={() => Alert.alert('Difficulty', 'Sets how much XP you earn on completion.\n\nEasy: 5 XP\nMedium: 10 XP\nHard: 25 XP\nEpic: 50 XP')}
              />
              <View style={{ width: 1, backgroundColor: '#252535' }} />
              <MetaCell
                icon="timer-outline" label="Est." value={task.estimated_minutes ? `${task.estimated_minutes}m` : '—'}
                onPress={() => Alert.alert('Estimated Time', 'How long this task is expected to take. Used to calculate the day\'s total load (Light / Moderate / Heavy) in the Planner.')}
              />
            </View>
          </View>

          {/* Linked goal — tappable, with reassign shortcut */}
          <TouchableOpacity
            onPress={() => setShowGoalPicker(true)}
            activeOpacity={0.75}
            style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: goalColor + '20', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flag-outline" size={18} color={goalColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Goal</Text>
              <Text style={{ color: task.goal ? goalColor : '#44445A', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                {task.goal ? (task.goal as Goal).title : 'No goal · tap to assign'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#44445A" />
          </TouchableOpacity>

          {/* Recurrence info */}
          {task.recurrence_type && task.recurrence_type !== 'none' && (
            <TouchableOpacity
              onPress={() => Alert.alert('Habit / Recurring', 'This task repeats on a schedule — it\'s a habit. Each time you mark it done you earn XP and extend your streak. It won\'t be removed from your planner after completion.')}
              activeOpacity={0.75}
              style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#5B5EF420', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="repeat-outline" size={18} color="#5B5EF4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Habit / Recurring</Text>
                <Text style={{ color: '#8888AA', fontSize: 13 }}>
                  {task.recurrence_type === 'daily' ? 'Every day'
                    : task.recurrence_type === 'weekly' ? `Every ${task.scheduled_day}`
                    : task.recurrence_days?.join(' · ') ?? 'Custom'}
                </Text>
              </View>
              <Ionicons name="information-circle-outline" size={16} color="#44445A" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252535' }}>
        <TouchableOpacity
          onPress={handleToggle}
          disabled={updateStatus.isPending || uncompleteTask.isPending || toggleRecurring.isPending || (!isCompleted && !isScheduledToday)}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden', opacity: (updateStatus.isPending || uncompleteTask.isPending || toggleRecurring.isPending || (!isCompleted && !isScheduledToday)) ? 0.4 : 1 }}
        >
          {isCompleted ? (
            <View style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="arrow-undo-outline" size={18} color="#8888AA" />
              <Text style={{ color: '#8888AA', fontWeight: '700', fontSize: 15 }}>
                {task.recurrence_type !== 'none' ? 'Mark undone today' : 'Mark as incomplete'}
              </Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#6B6EFF', '#5B5EF4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {task.recurrence_type !== 'none'
                  ? (isScheduledToday ? `Mark done today · +${xpAmount} XP` : 'Not scheduled today')
                  : `Complete · +${xpAmount} XP`}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Goal picker modal */}
      <Modal visible={showGoalPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalPicker(false)}>
        <View style={{ flex: 1, backgroundColor: '#0b0b14', paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
            <Text style={{ color: '#E8E8F2', fontSize: 17, fontWeight: '700' }}>Assign to goal</Text>
            <TouchableOpacity onPress={() => setShowGoalPicker(false)}>
              <Text style={{ color: '#8888AA', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {/* None option */}
            <TouchableOpacity
              onPress={() => handleReassignGoal(null)}
              disabled={updateTask.isPending}
              style={{ backgroundColor: task.goal_id == null ? '#5B5EF415' : '#13131e', borderWidth: 1, borderColor: task.goal_id == null ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Ionicons name="remove-circle-outline" size={18} color={task.goal_id == null ? '#5B5EF4' : '#44445A'} />
              <Text style={{ color: task.goal_id == null ? '#5B5EF4' : '#8888AA', fontWeight: '600', fontSize: 14 }}>No goal</Text>
              {task.goal_id == null && <Ionicons name="checkmark" size={16} color="#5B5EF4" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            {allGoals.filter((g) => g.status === 'active').map((g) => {
              const gColor = categoryColor(g.category);
              const isSelected = task.goal_id === g.id;
              const goalMilestone = milestones.find((m) => m.id === g.milestone_id);
              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => handleReassignGoal(g.id)}
                  disabled={updateTask.isPending}
                  style={{ backgroundColor: isSelected ? '#5B5EF415' : '#13131e', borderWidth: 1, borderColor: isSelected ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: gColor, gap: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#E8E8F2', fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>{g.title}</Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#5B5EF4" />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: gColor + '22' }}>
                      <Text style={{ color: gColor, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{g.category}</Text>
                    </View>
                    {goalMilestone && (
                      <Text style={{ color: '#44445A', fontSize: 11 }}>
                        <Ionicons name="trophy-outline" size={10} color="#44445A" /> {goalMilestone.title}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {allGoals.filter((g) => g.status === 'active').length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                <Ionicons name="flag-outline" size={28} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 14 }}>No goals yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <TaskForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleEdit}
        loading={updateTask.isPending}
        goals={allGoals}
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
