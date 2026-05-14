import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TimePicker } from '@/components/ui/TimePicker';
import { DatePicker } from '@/components/ui/DatePicker';
import { DAYS_OF_WEEK, DIFFICULTIES } from '@/constants/xp';
import { dayIndexToLabel } from '@/lib/utils';
import { DayOfWeek, Goal, TaskPriority, Difficulty, RecurrenceType } from '@/types';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Low', color: '#22C55E' },
];
const RECURRENCES: { value: RecurrenceType; label: string; icon: string }[] = [
  { value: 'none', label: 'Once', icon: 'radio-button-off-outline' },
  { value: 'daily', label: 'Daily', icon: 'sunny-outline' },
  { value: 'weekly', label: 'Weekly', icon: 'repeat-outline' },
  { value: 'custom', label: 'Custom', icon: 'options-outline' },
];

export interface TaskFormData {
  title: string;
  scheduled_day: DayOfWeek;
  due_date: string | null;
  goal_id: string | null;
  start_time: string | null;
  estimated_minutes: number;
  priority: TaskPriority;
  difficulty: Difficulty;
  recurrence_type: RecurrenceType;
  recurrence_days: DayOfWeek[] | null;
}

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  loading?: boolean;
  goals: Goal[];
  defaultDay?: DayOfWeek;
  defaultDate?: string;
  defaultGoalId?: string;
  mode?: 'create' | 'edit';
  initial?: Partial<TaskFormData>;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function TaskForm({
  visible, onClose, onSubmit, loading, goals, defaultDay = 'Mon', defaultDate,
  defaultGoalId, mode = 'create', initial,
}: TaskFormProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [taskDate, setTaskDate] = useState<string | null>(todayStr());
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId ?? null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [customDays, setCustomDays] = useState<DayOfWeek[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initial) {
        setTitle(initial.title ?? '');
        setDay(initial.scheduled_day ?? defaultDay);
        setTaskDate(initial.due_date ?? todayStr());
        setGoalId(initial.goal_id ?? null);
        setStartTime(initial.start_time ?? null);
        setDuration(initial.estimated_minutes ?? 30);
        setPriority(initial.priority ?? 'medium');
        setDifficulty(initial.difficulty ?? 'medium');
        setRecurrence(initial.recurrence_type ?? 'none');
        setCustomDays(initial.recurrence_days ?? []);
      } else {
        setTitle('');
        setDay(defaultDay);
        setTaskDate(defaultDate ?? todayStr());
        setGoalId(defaultGoalId ?? null);
        setStartTime(null);
        setDuration(30);
        setPriority('medium');
        setDifficulty('medium');
        setRecurrence(initial?.recurrence_type ?? 'none');
        setCustomDays([]);
      }
      setSubmitAttempted(false);
    }
  }, [visible]);


  const isHabit = recurrence !== 'none';
  // For habits, time is required; for tasks, date is required
  const canSubmit = !!title.trim() && !!taskDate && (!isHabit || !!startTime) && (recurrence !== 'custom' || customDays.length > 0);

  const toggleCustomDay = (d: DayOfWeek) => {
    setCustomDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const deriveDayFromDate = (dateStr: string): DayOfWeek => {
    const parsed = new Date(dateStr + 'T00:00:00');
    const jsDay = parsed.getDay();
    return dayIndexToLabel(jsDay === 0 ? 6 : jsDay - 1);
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    // For weekly habits use the user-selected day; for custom use the first selected day;
    // for one-off tasks and daily habits derive from the due/end date.
    let scheduled_day: DayOfWeek;
    if (recurrence === 'weekly') {
      scheduled_day = day;
    } else if (recurrence === 'custom' && customDays.length > 0) {
      scheduled_day = customDays[0];
    } else {
      scheduled_day = deriveDayFromDate(taskDate!);
    }
    onSubmit({
      title: title.trim(),
      scheduled_day,
      due_date: taskDate,
      goal_id: goalId,
      start_time: startTime,
      estimated_minutes: duration,
      priority,
      difficulty,
      recurrence_type: recurrence,
      recurrence_days: recurrence === 'custom' ? customDays : null,
    });
  };

  const xpForDiff = DIFFICULTIES.find((d) => d.value === difficulty)?.xp ?? 10;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-border">
          <Text className="text-text-primary text-lg font-semibold">{mode === 'edit' ? 'Edit Task' : 'New Task'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-text-secondary text-base">Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled">
          <View className="gap-5">
            {/* Definition — updates when switching between task and habit */}
            {!isHabit ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#5B5EF412', borderWidth: 1, borderColor: '#5B5EF433', borderRadius: 14, padding: 14 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#5B5EF4" style={{ marginTop: 1, flexShrink: 0 }} />
                <Text style={{ color: '#8888AA', fontSize: 12, flex: 1, lineHeight: 18 }}>
                  Tasks are one-off actions tied to a specific due date. Complete them to earn XP and make progress toward your goals.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#F59E0B12', borderWidth: 1, borderColor: '#F59E0B33', borderRadius: 14, padding: 14 }}>
                <Ionicons name="repeat-outline" size={16} color="#F59E0B" style={{ marginTop: 1, flexShrink: 0 }} />
                <Text style={{ color: '#8888AA', fontSize: 12, flex: 1, lineHeight: 18 }}>
                  Habits are recurring actions that repeat on a schedule. Each completion earns XP — consistency builds your qualifying days and rank.
                </Text>
              </View>
            )}

            <Input
              label="Task"
              required
              placeholder="What needs to get done?"
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={120}
            />

            {/* Recurrence — shown first so date/time section adapts */}
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary text-sm font-medium">Repeat</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Repeat', 'Once: one-off task with a specific due date.\nDaily: repeats every day.\nWeekly: repeats on the same day each week.\nCustom: pick specific days to repeat on.')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
                {RECURRENCES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setRecurrence(r.value)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                      borderWidth: 1,
                      borderColor: recurrence === r.value ? '#5B5EF4' : '#2A2A32',
                      backgroundColor: recurrence === r.value ? '#2A2B5E' : '#18181C',
                    }}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={16}
                      color={recurrence === r.value ? '#5B5EF4' : '#55556A'}
                    />
                    <Text style={{ color: recurrence === r.value ? '#5B5EF4' : '#55556A', fontSize: 11, fontWeight: '500', marginTop: 2 }}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom days picker */}
            {recurrence === 'custom' && (
              <View className="gap-2">
                <Text className="text-text-muted text-xs">Repeat on:</Text>
                <View className="flex-row gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => toggleCustomDay(d)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                        borderColor: customDays.includes(d) ? '#5B5EF4' : '#2A2A32',
                        backgroundColor: customDays.includes(d) ? '#2A2B5E' : '#18181C',
                      }}
                    >
                      <Text style={{ color: customDays.includes(d) ? '#5B5EF4' : '#55556A', fontSize: 13, fontWeight: '500' }}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {submitAttempted && customDays.length === 0 && (
                  <Text style={{ color: '#EF4444', fontSize: 11 }}>Select at least one day.</Text>
                )}
              </View>
            )}

            {/* Weekly — day picker */}
            {recurrence === 'weekly' && (
              <View className="gap-2">
                <Text className="text-text-secondary text-sm font-medium">Repeat on</Text>
                <View className="flex-row gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDay(d)}
                      className={`px-3.5 py-2 rounded-lg border ${day === d ? 'bg-accent-muted border-accent' : 'bg-surface-raised border-border'}`}
                    >
                      <Text className={`text-sm font-medium ${day === d ? 'text-accent' : 'text-text-secondary'}`}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Date + time — layout adapts to task vs habit */}
            {!isHabit ? (
              /* Task: due date required, time optional */
              <View style={{ gap: 12 }}>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text className="text-text-secondary text-sm font-medium">Due date</Text>
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Due date', 'The date this task must be completed. Required so the task appears on the right day in your planner.')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{ marginLeft: 2 }}
                    >
                      <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                    </TouchableOpacity>
                  </View>
                  <DatePicker value={taskDate} onChange={setTaskDate} />
                  {submitAttempted && !taskDate && (
                    <Text style={{ color: '#EF4444', fontSize: 11 }}>Due date is required.</Text>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text className="text-text-secondary text-sm font-medium">Start time</Text>
                    <Text style={{ color: '#8888AA', fontSize: 12 }}>(optional)</Text>
                  </View>
                  <TimePicker value={startTime} onChange={setStartTime} />
                </View>
              </View>
            ) : (
              /* Habit: end date required, time required */
              <View style={{ gap: 12 }}>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text className="text-text-secondary text-sm font-medium">End date</Text>
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert('End date', 'The last date this habit will repeat. After this date the habit stops appearing in your planner. Set it to a date far in the future to keep it running indefinitely.')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{ marginLeft: 2 }}
                    >
                      <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                    </TouchableOpacity>
                  </View>
                  <DatePicker value={taskDate} onChange={setTaskDate} />
                  {submitAttempted && !taskDate && (
                    <Text style={{ color: '#EF4444', fontSize: 11 }}>End date is required.</Text>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text className="text-text-secondary text-sm font-medium">Start time</Text>
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Start time', 'Required for habits so we can send you a reminder at the right time each day. You\'ll get a notification a few minutes before.')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{ marginLeft: 2 }}
                    >
                      <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                    </TouchableOpacity>
                  </View>
                  <TimePicker value={startTime} onChange={setStartTime} />
                  {submitAttempted && !startTime && (
                    <Text style={{ color: '#EF4444', fontSize: 11 }}>Start time is required for habits.</Text>
                  )}
                </View>
              </View>
            )}

            {/* Duration */}
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary text-sm font-medium">Duration</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Duration', 'Estimated time to complete this task. Used to calculate the day\'s load in the Planner.\n\nLight: ≤ 2 hours\nModerate: 2 – 5 hours\nHeavy: > 5 hours')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDuration(d)}
                    className={`px-3.5 py-2 rounded-lg border ${duration === d ? 'bg-accent-muted border-accent' : 'bg-surface-raised border-border'}`}
                  >
                    <Text className={`text-sm font-medium ${duration === d ? 'text-accent' : 'text-text-secondary'}`}>
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Difficulty */}
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary text-sm font-medium">Difficulty</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Difficulty',
                    'Sets how much XP you earn on completion.\n\nEasy: 5 XP\nMedium: 10 XP\nHard: 25 XP\nEpic: 50 XP',
                  )}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
                {DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => setDifficulty(d.value as Difficulty)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', gap: 2,
                      borderWidth: 1,
                      borderColor: difficulty === d.value ? d.color : '#2A2A32',
                      backgroundColor: difficulty === d.value ? d.color + '22' : '#18181C',
                    }}
                  >
                    <Text style={{ color: difficulty === d.value ? d.color : '#55556A', fontSize: 12, fontWeight: '600' }}>
                      {d.label}
                    </Text>
                    <Text style={{ color: difficulty === d.value ? d.color : '#55556A', fontSize: 11 }}>
                      +{d.xp} XP
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority */}
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary text-sm font-medium">Priority</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Priority', 'Visual urgency indicator. High = most urgent.\nDoes not affect XP — use Difficulty for that.')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setPriority(p.value)}
                    style={{
                      borderColor: priority === p.value ? p.color : '#2A2A32',
                      backgroundColor: priority === p.value ? p.color + '22' : '#18181C',
                    }}
                    className="flex-1 py-2 rounded-xl border items-center"
                  >
                    <Text style={{ color: priority === p.value ? p.color : '#8888A0' }}
                      className="text-sm font-medium">
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Goal dropdown */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text className="text-text-secondary text-sm font-medium">Goal (optional)</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Goal', 'Link this task to a goal to track progress. XP you earn from this task counts toward completing the goal.\n\nLeave as "No goal" if this is a standalone task.')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setShowGoalDropdown(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: '#18181C', borderWidth: 1, borderColor: goalId ? '#5B5EF4' : '#2A2A32',
                  borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
                }}
              >
                <Text style={{ color: goalId ? '#E8E8F0' : '#55556A', fontSize: 14 }} numberOfLines={1}>
                  {goalId ? (goals.find((g) => g.id === goalId)?.title ?? 'Select goal') : 'No goal'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#55556A" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>

        <View className="px-5 pb-8 pt-4 border-t border-border">
          <Button
            label={mode === 'edit' ? 'Save Changes' : isHabit ? `Add Habit · +${xpForDiff} XP` : `Add Task · +${xpForDiff} XP`}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            fullWidth
          />
        </View>
      </View>

      {/* Goal dropdown sheet */}
      <Modal visible={showGoalDropdown} transparent animationType="slide" onRequestClose={() => setShowGoalDropdown(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowGoalDropdown(false)}
        >
          <View style={{ backgroundColor: '#1A1A24', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#252535', paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
              <Text style={{ color: '#E8E8F2', fontWeight: '700', fontSize: 16 }}>Select Goal</Text>
              <TouchableOpacity onPress={() => setShowGoalDropdown(false)}>
                <Ionicons name="close" size={20} color="#8888AA" />
              </TouchableOpacity>
            </View>
            {/* No goal option */}
            <TouchableOpacity
              onPress={() => { setGoalId(null); setShowGoalDropdown(false); }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: '#1E1E28',
              }}
            >
              <Text style={{ color: goalId === null ? '#5B5EF4' : '#8888AA', fontSize: 14, fontWeight: goalId === null ? '600' : '400' }}>
                No goal
              </Text>
              {goalId === null && <Ionicons name="checkmark" size={18} color="#5B5EF4" />}
            </TouchableOpacity>
            {goals.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => { setGoalId(g.id); setShowGoalDropdown(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: '#1E1E28',
                }}
              >
                <Text style={{ color: goalId === g.id ? '#5B5EF4' : '#E8E8F2', fontSize: 14, fontWeight: goalId === g.id ? '600' : '400', flex: 1 }} numberOfLines={1}>
                  {g.title}
                </Text>
                {goalId === g.id && <Ionicons name="checkmark" size={18} color="#5B5EF4" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}
