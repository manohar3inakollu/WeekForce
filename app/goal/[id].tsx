import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO, isValid, isBefore } from 'date-fns';
import { useGoal, useUpdateGoal, useUpdateGoalStatus, useDeleteGoal } from '@/hooks/useGoals';
import { useTasksForGoal, useCreateTask, useUpdateTask, useUpdateTaskStatus, useUncompleteTask, useDeleteTask, useAllTasksFull, useToggleRecurringTask } from '@/hooks/useTasks';
import { useMilestones } from '@/hooks/useMilestones';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { GoalForm } from '@/components/goals/GoalForm';
import { Task, GoalCategory, Difficulty } from '@/types';
import { categoryColor } from '@/lib/utils';
import { GOAL_XP_BY_DIFFICULTY } from '@/constants/xp';

export default function GoalDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: goal, isLoading } = useGoal(id);
  const { data: tasks = [] } = useTasksForGoal(id);
  const { data: milestones = [] } = useMilestones();

  const updateGoal = useUpdateGoal();
  const updateGoalStatus = useUpdateGoalStatus();
  const deleteGoal = useDeleteGoal();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const uncompleteTask = useUncompleteTask();
  const toggleRecurring = useToggleRecurringTask();
  const deleteTask = useDeleteTask();
  const { data: allTasks = [] } = useAllTasksFull();

  const [showEditForm,        setShowEditForm]        = useState(false);
  const [showTaskForm,        setShowTaskForm]         = useState(false);
  const [showMilestonePicker, setShowMilestonePicker]  = useState(false);
  const [showTaskAssignModal, setShowTaskAssignModal]  = useState(false);

  const unassignedTasks = allTasks.filter((t) => {
    if (t.goal_id === id) return false;
    if (t.recurrence_type !== 'none') return true; // recurring tasks are never permanently done
    return !t.is_completed && t.status !== 'done';
  });

  const linkedMilestone = milestones.find((m) => m.id === goal?.milestone_id) ?? null;

  const handleEdit = async (data: {
    title: string;
    description?: string;
    category: GoalCategory;
    due_date: string | null;
    difficulty: Difficulty;
    milestone_id?: string | null;
  }) => {
    try {
      await updateGoal.mutateAsync({ id, updates: data });
      setShowEditForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete goal?',
      `"${goal?.title}" and all its tasks will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteGoal.mutate(id); router.back(); } },
      ],
    );
  };

  const handleAddTask = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync(data);
      setShowTaskForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleToggleGoal = async () => {
    if (!goal) return;
    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await updateGoalStatus.mutateAsync({ goal, status: newStatus });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleToggleTask = (task: Task) => {
    if (task.recurrence_type !== 'none') {
      toggleRecurring.mutate({ task, dateStr: todayStr });
      return;
    }
    if (task.status === 'done' || task.is_completed) {
      uncompleteTask.mutate(task.id);
    } else {
      updateStatus.mutate({ task, status: 'done' });
    }
  };

  const handlePickMilestone = async (milestoneId: string | null) => {
    try {
      await updateGoal.mutateAsync({ id, updates: { milestone_id: milestoneId } });
      setShowMilestonePicker(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleAssignTask = async (task: Task) => {
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { goal_id: id } });
      setShowTaskAssignModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleUnassignTask = (task: Task) => {
    Alert.alert('Remove from goal?', `"${task.title}" will no longer be under this goal.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => updateTask.mutate({ id: task.id, updates: { goal_id: null } }) },
    ]);
  };

  if (isLoading || !goal) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b14', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#44445A', fontSize: 14 }}>Loading…</Text>
      </View>
    );
  }

  const color = categoryColor(goal.category);
  const completed = tasks.filter((t) =>
    t.recurrence_type !== 'none'
      ? (t.completed_dates?.includes(todayStr) ?? false)
      : t.is_completed
  ).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const dueDateValid = goal.due_date && isValid(parseISO(goal.due_date));
  const isOverdue = goal.status === 'active' && dueDateValid && isBefore(parseISO(goal.due_date!), new Date());
  const goalXP = GOAL_XP_BY_DIFFICULTY[goal.difficulty ?? 'medium'];
  const isCompleted = goal.status === 'completed';

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
          colors={[color + '28', color + '08', '#0b0b14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, gap: 14 }}
        >
          {/* Milestone breadcrumb */}
          {linkedMilestone ? (
            <TouchableOpacity
              onPress={() => router.push(`/milestone/${linkedMilestone.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}
            >
              <Ionicons name="trophy-outline" size={12} color="#5B5EF4" />
              <Text style={{ color: '#5B5EF4', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {linkedMilestone.title}
              </Text>
              <Ionicons name="chevron-forward" size={12} color="#5B5EF4" />
            </TouchableOpacity>
          ) : null}

          {/* Category dot + status */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '44' }}>
              <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{goal.category}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: isCompleted ? '#22C55E18' : '#5B5EF418', borderWidth: 1, borderColor: isCompleted ? '#22C55E44' : '#5B5EF444' }}>
              <Text style={{ color: isCompleted ? '#22C55E' : '#5B5EF4', fontSize: 10, fontWeight: '700' }}>
                {isCompleted ? 'Completed' : 'Active'}
              </Text>
            </View>
            {isOverdue && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#EF444418', borderWidth: 1, borderColor: '#EF444444' }}>
                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>Overdue</Text>
              </View>
            )}
            {dueDateValid && !isOverdue && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535' }}>
                <Text style={{ color: '#8888AA', fontSize: 10, fontWeight: '600' }}>
                  Due {format(parseISO(goal.due_date!), 'MMM d')}
                </Text>
              </View>
            )}
          </View>

          <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800', lineHeight: 32 }}>{goal.title}</Text>

          {goal.description ? (
            <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>{goal.description}</Text>
          ) : null}

          {/* XP pill */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => Alert.alert('Goal XP', `Completing this goal awards +${goalXP} XP. The amount is based on the difficulty set when the goal was created.\n\nEasy: 50 XP · Medium: 100 XP · Hard: 200 XP · Epic: 400 XP`)}
              activeOpacity={0.8}
              style={{ backgroundColor: '#A855F720', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Text style={{ color: '#A855F7', fontWeight: '800', fontSize: 15 }}>+{goalXP} XP</Text>
              <Ionicons name="information-circle-outline" size={13} color="#A855F766" />
            </TouchableOpacity>
            <Text style={{ color: '#44445A', fontSize: 12 }}>on completion</Text>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {/* Milestone card */}
          <TouchableOpacity
            onPress={() => setShowMilestonePicker(true)}
            activeOpacity={0.75}
            style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#5B5EF420', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trophy-outline" size={18} color="#5B5EF4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Milestone</Text>
              <Text style={{ color: linkedMilestone ? '#E8E8F2' : '#44445A', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                {linkedMilestone ? linkedMilestone.title : 'No milestone · tap to assign'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#44445A" />
          </TouchableOpacity>

          {/* Progress card */}
          <View style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => Alert.alert('Progress', 'Based on completed vs total tasks under this goal. Complete all tasks to unlock the "Complete goal" button and earn XP.')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ color: '#44445A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Progress</Text>
                <Ionicons name="information-circle-outline" size={11} color="#44445A" />
              </TouchableOpacity>
              <Text style={{ color: '#8888AA', fontSize: 12 }}>{completed} / {total} tasks</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#1e1e2e', borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 6 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color, fontWeight: '700', fontSize: 22 }}>{pct}%</Text>
              {pct === 100 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '600' }}>All done!</Text>
                </View>
              )}
            </View>
          </View>

          {/* Tasks section */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text style={{ color: '#E8E8F2', fontWeight: '700', fontSize: 15 }}>Tasks</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {unassignedTasks.length > 0 && (
                  <TouchableOpacity onPress={() => setShowTaskAssignModal(true)}>
                    <Text style={{ color: '#8888AA', fontSize: 13, fontWeight: '600' }}>Assign existing</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowTaskForm(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="add-circle-outline" size={18} color="#5B5EF4" />
                  <Text style={{ color: '#5B5EF4', fontSize: 13, fontWeight: '600' }}>Add task</Text>
                </TouchableOpacity>
              </View>
            </View>

            {tasks.length === 0 ? (
              <TouchableOpacity
                onPress={() => setShowTaskForm(true)}
                activeOpacity={0.6}
                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#252535', borderRadius: 14, paddingVertical: 20, alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="add-circle-outline" size={24} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 13 }}>No tasks yet — tap to add one</Text>
              </TouchableOpacity>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task)}
                  onPress={() => router.push(`/task/${task.id}`)}
                  onUnassign={() => handleUnassignTask(task)}
                  isCompletedOverride={task.recurrence_type !== 'none' ? (task.completed_dates?.includes(todayStr) ?? false) : undefined}
                  onDelete={() =>
                    Alert.alert(
                      'Delete task?',
                      `"${task.title}" will be permanently removed.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(task.id) },
                      ],
                    )
                  }
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252535' }}>
        <TouchableOpacity
          onPress={handleToggleGoal}
          disabled={updateGoalStatus.isPending || (!isCompleted && pct < 100)}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden', opacity: (updateGoalStatus.isPending || (!isCompleted && pct < 100)) ? 0.4 : 1 }}
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
              <Ionicons name="flag" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {pct < 100 ? (total === 0 ? 'Add tasks to complete goal' : 'Complete all tasks first') : `Complete goal · +${goalXP} XP`}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Milestone picker modal */}
      <Modal visible={showMilestonePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMilestonePicker(false)}>
        <View style={{ flex: 1, backgroundColor: '#0b0b14', paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
            <Text style={{ color: '#E8E8F2', fontSize: 17, fontWeight: '700' }}>Assign to milestone</Text>
            <TouchableOpacity onPress={() => setShowMilestonePicker(false)}>
              <Text style={{ color: '#8888AA', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {/* None option */}
            <TouchableOpacity
              onPress={() => handlePickMilestone(null)}
              disabled={updateGoal.isPending}
              style={{ backgroundColor: goal.milestone_id == null ? '#5B5EF415' : '#13131e', borderWidth: 1, borderColor: goal.milestone_id == null ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Ionicons name="remove-circle-outline" size={18} color={goal.milestone_id == null ? '#5B5EF4' : '#44445A'} />
              <Text style={{ color: goal.milestone_id == null ? '#5B5EF4' : '#8888AA', fontWeight: '600', fontSize: 14 }}>No milestone</Text>
              {goal.milestone_id == null && <Ionicons name="checkmark" size={16} color="#5B5EF4" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            {milestones.filter((m) => m.status === 'active').map((m) => {
              const mColor = categoryColor(m.category);
              const isSelected = goal.milestone_id === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handlePickMilestone(m.id)}
                  disabled={updateGoal.isPending}
                  style={{ backgroundColor: isSelected ? '#5B5EF415' : '#13131e', borderWidth: 1, borderColor: isSelected ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: mColor, gap: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: isSelected ? '#E8E8F2' : '#E8E8F2', fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>{m.title}</Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#5B5EF4" />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: mColor + '22' }}>
                      <Text style={{ color: mColor, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{m.category}</Text>
                    </View>
                    <Text style={{ color: '#44445A', fontSize: 11, textTransform: 'capitalize' }}>{m.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {milestones.filter((m) => m.status === 'active').length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
                <Ionicons name="trophy-outline" size={28} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 14 }}>No milestones yet</Text>
                <TouchableOpacity onPress={() => { setShowMilestonePicker(false); router.push('/(tabs)/goals'); }} activeOpacity={0.7}>
                  <Text style={{ color: '#5B5EF4', fontSize: 13, fontWeight: '600' }}>Go to Goals → Milestones tab to create one</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <GoalForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleEdit}
        loading={updateGoal.isPending}
        milestones={milestones}
        initial={goal}
        mode="edit"
      />

      <TaskForm
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={handleAddTask}
        loading={createTask.isPending}
        goals={[goal]}
        defaultGoalId={goal.id}
      />

      {/* Assign existing task modal */}
      <Modal visible={showTaskAssignModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTaskAssignModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#0b0b14', paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
            <Text style={{ color: '#E8E8F2', fontSize: 17, fontWeight: '700' }}>Assign a task</Text>
            <TouchableOpacity onPress={() => setShowTaskAssignModal(false)}>
              <Text style={{ color: '#8888AA', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {unassignedTasks.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                <Ionicons name="checkmark-done-outline" size={28} color="#44445A" />
                <Text style={{ color: '#44445A', fontSize: 14 }}>All tasks are already under this goal</Text>
              </View>
            ) : (
              unassignedTasks.map((task) => {
                const priColor = ({ high: '#EF4444', medium: '#F59E0B', low: '#22C55E' } as any)[task.priority ?? 'medium'];
                return (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => handleAssignTask(task)}
                    disabled={updateTask.isPending}
                    activeOpacity={0.75}
                    style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: priColor, gap: 4 }}
                  >
                    <Text style={{ color: '#E8E8F2', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{task.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#44445A', fontSize: 11, textTransform: 'capitalize' }}>{task.priority} priority</Text>
                      <Text style={{ color: '#44445A', fontSize: 11 }}>·</Text>
                      <Text style={{ color: '#44445A', fontSize: 11 }}>{task.scheduled_day}</Text>
                      {task.goal_id && (
                        <Text style={{ color: '#55556A', fontSize: 11 }}>· currently in another goal</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
