import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, RefreshControl, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGoals, useAllGoalsFull, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones';
import { useTasksForWeek, useAllTasksFull, useCreateTask } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { MilestoneCard } from '@/components/goals/MilestoneCard';
import { MilestoneForm, MilestoneFormData } from '@/components/goals/MilestoneForm';
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm';
import { WeekNav } from '@/components/ui/WeekNav';
import { Goal, GoalCategory, Milestone, Difficulty } from '@/types';
import { CAT_COLORS } from '@/lib/utils';

const FILTER_CATS = ['all', 'health', 'work', 'personal', 'learning', 'finance', 'other'] as const;
type FilterCat = typeof FILTER_CATS[number];

interface GoalFormData {
  title: string;
  description?: string;
  category: GoalCategory;
  start_date: string | null;
  due_date: string | null;
  difficulty?: Difficulty;
  milestone_id?: string | null;
}

const HIERARCHY_TABS = ['Goals', 'Milestones'] as const;
type HierarchyTab = typeof HIERARCHY_TABS[number];

export default function GoalsScreen() {
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const { data: goals = [], isLoading: goalsLoading, isRefetching: goalsRefetching, refetch: refetchGoals } = useGoals(weekStart);
  const { data: milestones = [], isLoading: milestonesLoading, isRefetching: milestonesRefetching, refetch: refetchMilestones } = useMilestones();
  const { data: tasks = [] } = useTasksForWeek(weekStart);
  const { data: allTasks = [] } = useAllTasksFull();
  const { data: allGoals = [] } = useAllGoalsFull();

  const createGoal      = useCreateGoal();
  const updateGoal      = useUpdateGoal();
  const deleteGoal      = useDeleteGoal();
  const createTask      = useCreateTask();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [activeTab,          setActiveTab]          = useState<HierarchyTab>('Goals');
  const [showGoalForm,       setShowGoalForm]        = useState(false);
  const [editingGoal,        setEditingGoal]         = useState<Goal | null>(null);
  const [taskGoalId,         setTaskGoalId]          = useState<string | null>(null);
  const [filterCat,          setFilterCat]           = useState<FilterCat>('all');
  const [milestoneFilterCat, setMilestoneFilterCat]  = useState<FilterCat>('all');
  const [showNewMenu,        setShowNewMenu]         = useState(false);
  const [showMilestoneForm,  setShowMilestoneForm]   = useState(false);
  const [editingMilestone,   setEditingMilestone]    = useState<Milestone | null>(null);
  const [goalError,          setGoalError]           = useState<string | null>(null);
  const [editGoalError,      setEditGoalError]       = useState<string | null>(null);

  const filteredGoals      = filterCat === 'all'          ? goals      : goals.filter((g) => (g.category ?? 'other') === filterCat);
  const filteredMilestones = milestoneFilterCat === 'all' ? milestones : milestones.filter((m) => (m.category ?? 'other') === milestoneFilterCat);

  const activeCat    = activeTab === 'Goals' ? filterCat          : milestoneFilterCat;
  const setActiveCat = activeTab === 'Goals' ? setFilterCat       : setMilestoneFilterCat;

  const handleCreateGoal = async (data: GoalFormData) => {
    setGoalError(null);
    try {
      await createGoal.mutateAsync(data);
      setShowGoalForm(false);
    } catch (e: any) {
      setGoalError(e?.message ?? 'Could not create goal. Please try again.');
    }
  };

  const handleEditGoal = async (data: GoalFormData) => {
    if (!editingGoal) return;
    setEditGoalError(null);
    try {
      await updateGoal.mutateAsync({ id: editingGoal.id, updates: data });
      setEditingGoal(null);
    } catch (e: any) {
      setEditGoalError(e?.message ?? 'Could not update goal. Please try again.');
    }
  };

  const handleAddTask = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync(data);
      setTaskGoalId(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleCreateMilestone = async (data: MilestoneFormData) => {
    try {
      await createMilestone.mutateAsync(data);
      setShowMilestoneForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleEditMilestone = async (data: MilestoneFormData) => {
    if (!editingMilestone) return;
    try {
      await updateMilestone.mutateAsync({ id: editingMilestone.id, updates: data });
      setEditingMilestone(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const taskGoal = goals.find((g) => g.id === taskGoalId) ?? null;
  const refetch   = activeTab === 'Goals' ? refetchGoals  : refetchMilestones;

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-3 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View>
            <Text style={{ color: '#E8E8F2', fontSize: 24, fontWeight: '700' }}>
              {activeTab === 'Goals' ? 'Goals' : 'Milestones'}
            </Text>
            <Text style={{ color: '#55556A', fontSize: 12, marginTop: 2 }}>
              {activeTab === 'Goals' ? 'Weekly targets' : 'Long-term objectives'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Goals / Milestones toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 8, padding: 2 }}>
              {HIERARCHY_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6,
                    backgroundColor: activeTab === tab ? '#2A2A32' : 'transparent',
                  }}
                >
                  <Text style={{ color: activeTab === tab ? '#E8E8F0' : '#55556A', fontSize: 12, fontWeight: '600' }}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* New button */}
            <TouchableOpacity onPress={() => setShowNewMenu(true)} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#6B6EFF', '#5B5EF4']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        {activeTab === 'Goals' && (
          <View className="mt-2">
            <WeekNav />
          </View>
        )}
      </View>

      {/* Category filter chips — always visible */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' }}
        style={{ flexShrink: 0, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#252535' }}
      >
        {FILTER_CATS.map((cat) => {
          const sel = activeCat === cat;
          const color = cat === 'all' ? '#5B5EF4' : (CAT_COLORS[cat] ?? '#6B7280');
          const sourceList = activeTab === 'Goals' ? goals : milestones;
          const count = cat === 'all'
            ? sourceList.length
            : sourceList.filter((item) => ((item as any).category ?? 'other') === cat).length;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCat(cat)}
              style={{
                flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
                backgroundColor: sel ? color : '#13131e',
                borderWidth: 1, borderColor: sel ? color : '#252535',
              }}
            >
              {cat !== 'all' && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sel ? '#fff' : color }} />
              )}
              <Text style={{ fontSize: 11, fontWeight: '600', color: sel ? '#fff' : '#55556A', textTransform: 'capitalize' }}>
                {cat}
              </Text>
              {count > 0 && (
                <View style={{ backgroundColor: sel ? 'rgba(255,255,255,0.25)' : color + '30', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' }}>
                  <Text style={{ color: sel ? '#fff' : color, fontSize: 9, fontWeight: '700' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hierarchy breadcrumb — always visible */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A24' }}>
        {(['Milestones', 'Goals', 'Habits', 'Tasks'] as const).map((item, i) => {
          const isActive = (item === 'Milestones' && activeTab === 'Milestones') || (item === 'Goals' && activeTab === 'Goals');
          const activeColor = item === 'Milestones' ? '#5B5EF4' : '#E8E8F2';
          return (
            <React.Fragment key={item}>
              {i > 0 && <Ionicons name="chevron-forward" size={10} color="#44445A" />}
              {(item === 'Goals' || item === 'Milestones') ? (
                <TouchableOpacity onPress={() => setActiveTab(item as HierarchyTab)}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? activeColor : '#44445A', opacity: isActive ? 1 : 0.55 }}>{item}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#44445A', opacity: 0.55 }}>
                  {item}
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Loading state */}
      {((activeTab === 'Goals' && goalsLoading && !goalsRefetching) ||
        (activeTab === 'Milestones' && milestonesLoading && !milestonesRefetching)) && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5B5EF4" />
        </View>
      )}

      {/* ── Goals list ── */}
      {activeTab === 'Goals' && !(goalsLoading && !goalsRefetching) && (
        <FlatList
          data={filteredGoals}
          keyExtractor={(item) => item.id}
          renderItem={({ item: goal }) => (
            <GoalCard
              goal={goal}
              tasks={allTasks.filter((t) => t.goal_id === goal.id)}
              onPress={() => router.push(`/goal/${goal.id}`)}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() =>
                Alert.alert('Delete goal?', `"${goal.title}" and all its tasks will be removed permanently.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteGoal.mutate(goal.id) },
                ])
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={goalsRefetching} onRefresh={refetchGoals} tintColor="#5B5EF4" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 80, gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#222228', borderWidth: 1, borderColor: '#252535', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="flag-outline" size={28} color="#55556A" />
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#E8E8F2', fontWeight: '600', fontSize: 15 }}>
                  {filterCat === 'all' ? 'No goals yet' : `No ${filterCat} goals`}
                </Text>
                <Text style={{ color: '#55556A', fontSize: 13, textAlign: 'center' }}>
                  {filterCat === 'all'
                    ? 'Set a goal to start tracking your progress this week.'
                    : 'Try a different category or add a new goal.'}
                </Text>
              </View>
              {filterCat === 'all' && (
                <TouchableOpacity onPress={() => setShowGoalForm(true)} style={{ borderRadius: 12, overflow: 'hidden' }}>
                  <LinearGradient colors={['#6B6EFF', '#5B5EF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add your first goal</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Milestones list ── */}
      {activeTab === 'Milestones' && !(milestonesLoading && !milestonesRefetching) && (
        <FlatList
          data={filteredMilestones}
          keyExtractor={(item) => item.id}
          renderItem={({ item: m }) => (
            <MilestoneCard
              milestone={m}
              linkedGoalCount={allGoals.filter((g) => g.milestone_id === m.id).length}
              onPress={() => router.push(`/milestone/${m.id}` as any)}
              onEdit={() => setEditingMilestone(m)}
              onDelete={() =>
                Alert.alert('Delete milestone?', `"${m.title}" will be permanently removed. Goals linked to it will not be deleted.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMilestone.mutate(m.id) },
                ])
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={milestonesRefetching} onRefresh={refetchMilestones} tintColor="#5B5EF4" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 14 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#5B5EF418', borderWidth: 1, borderColor: '#5B5EF433', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trophy-outline" size={28} color="#5B5EF4" />
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#E8E8F2', fontSize: 17, fontWeight: '700' }}>No milestones yet</Text>
                <Text style={{ color: '#55556A', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 260 }}>
                  Milestones are big life objectives that span months. Goals and tasks ladder up to them.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMilestoneForm(true)} style={{ borderRadius: 12, overflow: 'hidden' }}>
                <LinearGradient colors={['#6B6EFF', '#5B5EF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Add first milestone</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── New item modal ── */}
      <Modal visible={showNewMenu} transparent animationType="fade" onRequestClose={() => setShowNewMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000088' }} activeOpacity={1} onPress={() => setShowNewMenu(false)}>
          <View style={{ position: 'absolute', bottom: 40, left: 16, right: 16, backgroundColor: '#1A1A24', borderRadius: 20, borderWidth: 1, borderColor: '#252535', overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
              <Text style={{ color: '#55556A', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Create new</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setShowNewMenu(false); setShowGoalForm(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#22C55E18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="flag-outline" size={20} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#E8E8F2', fontWeight: '700', fontSize: 15 }}>Goal</Text>
                <Text style={{ color: '#55556A', fontSize: 12, marginTop: 2 }}>Weekly target for a life area</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#44445A" />
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: '#252535', marginHorizontal: 16 }} />
            <TouchableOpacity
              onPress={() => { setShowNewMenu(false); setActiveTab('Milestones'); setShowMilestoneForm(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#5B5EF418', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trophy-outline" size={20} color="#5B5EF4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#E8E8F2', fontWeight: '700', fontSize: 15 }}>Milestone</Text>
                <Text style={{ color: '#55556A', fontSize: 12, marginTop: 2 }}>Long-term life objective</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#44445A" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <GoalForm
        visible={showGoalForm}
        onClose={() => { setShowGoalForm(false); setGoalError(null); }}
        onSubmit={handleCreateGoal}
        loading={createGoal.isPending}
        errorMessage={goalError}
        milestones={milestones}
        mode="create"
      />

      <GoalForm
        visible={!!editingGoal}
        onClose={() => { setEditingGoal(null); setEditGoalError(null); }}
        onSubmit={handleEditGoal}
        loading={updateGoal.isPending}
        errorMessage={editGoalError}
        milestones={milestones}
        initial={editingGoal ?? undefined}
        mode="edit"
      />

      <MilestoneForm
        visible={showMilestoneForm}
        onClose={() => setShowMilestoneForm(false)}
        onSubmit={handleCreateMilestone}
        loading={createMilestone.isPending}
        mode="create"
      />

      <MilestoneForm
        visible={!!editingMilestone}
        onClose={() => setEditingMilestone(null)}
        onSubmit={handleEditMilestone}
        loading={updateMilestone.isPending}
        initial={editingMilestone ?? undefined}
        mode="edit"
      />

      <TaskForm
        visible={!!taskGoalId}
        onClose={() => setTaskGoalId(null)}
        onSubmit={handleAddTask}
        loading={createTask.isPending}
        goals={taskGoal ? [taskGoal] : []}
        defaultGoalId={taskGoalId ?? undefined}
      />
    </View>
  );
}
