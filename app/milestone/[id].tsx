import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { useMilestone, useUpdateMilestone, useUpdateMilestoneStatus, useDeleteMilestone } from '@/hooks/useMilestones';
import { useGoalsByMilestone, useCreateGoal, useUpdateGoal, useAllGoalsFull } from '@/hooks/useGoals';
import { useAllTasksFull } from '@/hooks/useTasks';
import { MilestoneForm, MilestoneFormData } from '@/components/goals/MilestoneForm';
import { GoalForm } from '@/components/goals/GoalForm';
import { categoryColor } from '@/lib/utils';
import { MILESTONE_XP_BY_DIFFICULTY } from '@/constants/xp';
import { Goal, GoalCategory } from '@/types';

export default function MilestoneDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: milestone, isLoading } = useMilestone(id);

  const updateMilestone       = useUpdateMilestone();
  const updateMilestoneStatus = useUpdateMilestoneStatus();
  const deleteMilestone       = useDeleteMilestone();
  const createGoal            = useCreateGoal();
  const updateGoal            = useUpdateGoal();
  const { data: linkedGoals = [] }  = useGoalsByMilestone(id);
  const { data: allGoals = [] }     = useAllGoalsFull();
  const { data: allTasks = [] }     = useAllTasksFull();

  const [showEditForm,    setShowEditForm]    = useState(false);
  const [showGoalForm,    setShowGoalForm]    = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const unassignedGoals = allGoals.filter((g) => g.milestone_id !== id && g.status === 'active');

  const goalFormInitial = useMemo(
    () => ({ title: '', category: (milestone?.category ?? 'work') as GoalCategory, milestone_id: id }),
    [milestone?.category, id],
  );

  const handleEdit = async (data: MilestoneFormData) => {
    try {
      await updateMilestone.mutateAsync({ id, updates: data });
      setShowEditForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete milestone?',
      'This will permanently remove this milestone. Goals linked to it will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMilestone.mutate(id, { onSuccess: () => router.back() }),
        },
      ],
    );
  };

  const handleToggleStatus = async () => {
    if (!milestone) return;
    const newStatus = milestone.status === 'completed' ? 'active' : 'completed';
    try {
      await updateMilestoneStatus.mutateAsync({ id, status: newStatus, milestone });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      await createGoal.mutateAsync({ ...data, milestone_id: id });
      setShowGoalForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleAssignGoal = async (goal: Goal) => {
    try {
      await updateGoal.mutateAsync({ id: goal.id, updates: { milestone_id: id } });
      setShowAssignModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleUnassignGoal = (goal: Goal) => {
    Alert.alert('Remove from milestone?', `"${goal.title}" will no longer be under this milestone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => updateGoal.mutate({ id: goal.id, updates: { milestone_id: null } }) },
    ]);
  };

  if (isLoading || !milestone) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b14', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#44445A', fontSize: 14 }}>Loading…</Text>
      </View>
    );
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const color = categoryColor(milestone.category);
  const isCompleted = milestone.status === 'completed';
  const allGoalsDone = linkedGoals.length > 0 && linkedGoals.every((g) => g.status === 'completed');
  const xp = MILESTONE_XP_BY_DIFFICULTY[milestone.difficulty] ?? 1000;
  const activeColor = isCompleted ? '#22C55E' : color;

  const startValid = !!milestone.start_date && isValid(parseISO(milestone.start_date));
  const dueValid   = !!milestone.due_date   && isValid(parseISO(milestone.due_date));

  let timelinePercent = 0;
  let daysLeft = 0;
  if (startValid && dueValid && !isCompleted) {
    const start = parseISO(milestone.start_date!);
    const end   = parseISO(milestone.due_date!);
    const total   = differenceInDays(end, start);
    const elapsed = differenceInDays(new Date(), start);
    timelinePercent = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    daysLeft = Math.max(0, differenceInDays(end, new Date()));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b14' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#252535' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={20} color="#5B5EF4" />
          <Text style={{ color: '#5B5EF4', fontSize: 15, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 6 }}>
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
          colors={[activeColor + '28', activeColor + '08', '#0b0b14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, gap: 14 }}
        >
          {/* Badges row */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: (isCompleted ? '#44445A' : color) + '22', borderWidth: 1, borderColor: (isCompleted ? '#44445A' : color) + '44' }}>
              <Text style={{ color: isCompleted ? '#55556A' : color, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>
                {milestone.category}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535' }}>
              <Text style={{ color: '#8888AA', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                {milestone.difficulty}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: isCompleted ? '#22C55E18' : '#5B5EF418', borderWidth: 1, borderColor: isCompleted ? '#22C55E44' : '#5B5EF444' }}>
              <Text style={{ color: isCompleted ? '#22C55E' : '#5B5EF4', fontSize: 10, fontWeight: '700' }}>
                {isCompleted ? 'Completed' : 'Active'}
              </Text>
            </View>
          </View>

          <Text style={{ color: isCompleted ? '#8888AA' : '#E8E8F2', fontSize: 26, fontWeight: '800', lineHeight: 32, textDecorationLine: isCompleted ? 'line-through' : 'none' }}>
            {milestone.title}
          </Text>

          {milestone.description ? (
            <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>{milestone.description}</Text>
          ) : null}

          {/* XP + date range */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => Alert.alert('Milestone XP', `Earned when you mark this milestone complete.\n\nEasy: 500 XP\nMedium: 1,000 XP\nHard: 2,000 XP\nEpic: 5,000 XP\n\nThis milestone is set to ${milestone.difficulty} → +${xp} XP`)}
              activeOpacity={0.75}
              style={{ backgroundColor: '#A855F720', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Text style={{ color: '#A855F7', fontWeight: '800', fontSize: 15 }}>+{xp} XP</Text>
              <Ionicons name="information-circle-outline" size={13} color="#A855F766" />
            </TouchableOpacity>
            {(startValid || dueValid) && (
              <Text style={{ color: '#55556A', fontSize: 12 }}>
                {startValid ? format(parseISO(milestone.start_date!), 'MMM d') : '—'}
                {' → '}
                {dueValid ? format(parseISO(milestone.due_date!), 'MMM d, yyyy') : '—'}
              </Text>
            )}
          </View>
        </LinearGradient>

        {/* Timeline card */}
        {!isCompleted && startValid && dueValid && (
          <View style={{ marginHorizontal: 16, marginTop: 4, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, padding: 16, gap: 10 }}>
            <Text style={{ color: '#44445A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Timeline</Text>
            <View style={{ height: 8, backgroundColor: '#1e1e2e', borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${timelinePercent}%` as any, backgroundColor: color, borderRadius: 6 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => Alert.alert('Timeline progress', `${Math.round(timelinePercent)}% of the time between start date and due date has elapsed. Aim to have your goals completed before this reaches 100%.`)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={{ color: '#55556A', fontSize: 12 }}>{Math.round(timelinePercent)}% elapsed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert('Days remaining', daysLeft === 0 ? 'This milestone is due today. Complete it to earn your XP!' : `${daysLeft} days until the due date. Mark all linked goals complete before then.`)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={{ color: daysLeft === 0 ? '#F87171' : '#8888AA', fontSize: 12, fontWeight: '600' }}>
                  {daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Goals section */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: '#44445A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Goals ({linkedGoals.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {unassignedGoals.length > 0 && (
                <TouchableOpacity onPress={() => setShowAssignModal(true)}>
                  <Text style={{ color: '#8888AA', fontSize: 12, fontWeight: '600' }}>Assign existing</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowGoalForm(true)}>
                <Text style={{ color: '#5B5EF4', fontSize: 12, fontWeight: '600' }}>+ New goal</Text>
              </TouchableOpacity>
            </View>
          </View>

          {linkedGoals.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: '#252535', borderStyle: 'dashed', borderRadius: 14, paddingVertical: 20, alignItems: 'center', gap: 6 }}>
              <Ionicons name="flag-outline" size={20} color="#44445A" />
              <Text style={{ color: '#44445A', fontSize: 13 }}>No goals yet</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {linkedGoals.map((goal) => {
                const gColor = categoryColor(goal.category);
                const goalTasks = allTasks.filter((t) => t.goal_id === goal.id);
                const completedTasks = goalTasks.filter((t) =>
                  t.recurrence_type !== 'none' ? (t.completed_dates?.includes(todayStr) ?? false) : t.is_completed
                ).length;
                const goalPct = goalTasks.length > 0 ? Math.round((completedTasks / goalTasks.length) * 100) : 0;
                return (
                  <View
                    key={goal.id}
                    style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, borderLeftWidth: 3, borderLeftColor: gColor, overflow: 'hidden' }}
                  >
                    <TouchableOpacity onPress={() => router.push(`/goal/${goal.id}`)} activeOpacity={0.8} style={{ padding: 14, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: goal.status === 'completed' ? '#55556A' : '#E8E8F2', fontSize: 14, fontWeight: '600', flex: 1, textDecorationLine: goal.status === 'completed' ? 'line-through' : 'none' }} numberOfLines={1}>
                          {goal.title}
                        </Text>
                        <TouchableOpacity onPress={() => handleUnassignGoal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 10 }}>
                          <Ionicons name="unlink-outline" size={15} color="#55556A" />
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: gColor + '22' }}>
                          <Text style={{ color: gColor, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{goal.category}</Text>
                        </View>
                        <Text style={{ color: '#44445A', fontSize: 11, textTransform: 'capitalize' }}>{goal.difficulty}</Text>
                        {goal.status === 'completed' && <Ionicons name="checkmark-circle" size={13} color="#22C55E" />}
                        <Text style={{ color: '#44445A', fontSize: 11, marginLeft: 'auto' }}>
                          {completedTasks}/{goalTasks.length} tasks
                        </Text>
                      </View>
                      {goalTasks.length > 0 && (
                        <View style={{ gap: 3 }}>
                          <View style={{ height: 4, backgroundColor: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${goalPct}%` as any, backgroundColor: goal.status === 'completed' ? '#22C55E' : gColor, borderRadius: 3 }} />
                          </View>
                          <Text style={{ color: goal.status === 'completed' ? '#22C55E' : gColor, fontSize: 10, fontWeight: '600', textAlign: 'right' }}>{goalPct}%</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252535' }}>
        <TouchableOpacity
          onPress={handleToggleStatus}
          disabled={updateMilestoneStatus.isPending || (!isCompleted && !allGoalsDone)}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden', opacity: (updateMilestoneStatus.isPending || (!isCompleted && !allGoalsDone)) ? 0.4 : 1 }}
        >
          {isCompleted ? (
            <View style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="arrow-undo-outline" size={18} color="#8888AA" />
              <Text style={{ color: '#8888AA', fontWeight: '700', fontSize: 15 }}>Mark as active</Text>
            </View>
          ) : (
            <LinearGradient
              colors={[color + 'DD', color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="trophy" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {!allGoalsDone ? 'Complete all goals first' : `Complete milestone · +${xp} XP`}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Assign existing goals modal */}
      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAssignModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#0b0b14', paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
            <Text style={{ color: '#E8E8F2', fontSize: 17, fontWeight: '700' }}>Assign a goal</Text>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <Text style={{ color: '#8888AA', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
            {unassignedGoals.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                <Ionicons name="checkmark-done-outline" size={28} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 14 }}>No unassigned active goals</Text>
              </View>
            ) : (
              unassignedGoals.map((goal) => {
                const gColor = categoryColor(goal.category);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => handleAssignGoal(goal)}
                    disabled={updateGoal.isPending}
                    activeOpacity={0.75}
                    style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: gColor, gap: 5 }}
                  >
                    <Text style={{ color: '#E8E8F2', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{goal.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: gColor + '22' }}>
                        <Text style={{ color: gColor, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{goal.category}</Text>
                      </View>
                      <Text style={{ color: '#44445A', fontSize: 11, textTransform: 'capitalize' }}>{goal.difficulty}</Text>
                      {goal.milestone_id && (
                        <Text style={{ color: '#55556A', fontSize: 11 }}>· currently in another milestone</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      <MilestoneForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleEdit}
        loading={updateMilestone.isPending}
        initial={milestone}
        mode="edit"
      />

      <GoalForm
        visible={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        onSubmit={handleCreateGoal}
        loading={createGoal.isPending}
        milestones={[milestone]}
        initial={goalFormInitial}
      />
    </View>
  );
}
