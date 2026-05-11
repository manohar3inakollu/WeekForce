import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TimePicker } from '@/components/ui/TimePicker';
import { DAYS_OF_WEEK, DIFFICULTIES } from '@/constants/xp';
import { DayOfWeek, Goal, TaskPriority, Difficulty, RecurrenceType } from '@/types';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Low', color: '#22C55E' },
];
const RECURRENCES: { value: RecurrenceType; label: string; icon: string; tip: string }[] = [
  { value: 'none', label: 'Once', icon: 'radio-button-off-outline', tip: 'This task appears only once on the scheduled day.' },
  { value: 'daily', label: 'Daily', icon: 'sunny-outline', tip: 'This task repeats every day of every week.' },
  { value: 'weekly', label: 'Weekly', icon: 'repeat-outline', tip: 'This task repeats on the same day each week.' },
  { value: 'custom', label: 'Custom', icon: 'options-outline', tip: 'Choose specific days for this task to repeat.' },
];

export interface TaskFormData {
  title: string;
  scheduled_day: DayOfWeek;
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
  defaultGoalId?: string;
  mode?: 'create' | 'edit';
  initial?: Partial<TaskFormData>;
}

export function TaskForm({
  visible, onClose, onSubmit, loading, goals, defaultDay = 'Mon', defaultGoalId,
  mode = 'create', initial,
}: TaskFormProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId ?? goals[0]?.id ?? null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [customDays, setCustomDays] = useState<DayOfWeek[]>([]);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initial) {
        setTitle(initial.title ?? '');
        setDay(initial.scheduled_day ?? defaultDay);
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
        setGoalId(defaultGoalId ?? goals[0]?.id ?? null);
        setStartTime(null);
        setDuration(30);
        setPriority('medium');
        setDifficulty('medium');
        setRecurrence(initial?.recurrence_type ?? 'none');
        setCustomDays([]);
      }
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !goalId && goals.length > 0) {
      setGoalId(defaultGoalId ?? goals[0].id);
    }
  }, [goals]);

  const toggleCustomDay = (d: DayOfWeek) => {
    setCustomDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      scheduled_day: day,
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
            <Input
              label="Task"
              placeholder="What needs to get done?"
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={120}
            />

            <TimePicker label="Start time" value={startTime} onChange={setStartTime} />

            {/* Duration */}
            <View className="gap-2">
              <Text className="text-text-secondary text-sm font-medium">Duration</Text>
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

            {/* Recurrence */}
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary text-sm font-medium">Repeat</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Repeat', 'Once: appears only on the chosen day.\nDaily: appears every day of the week.\nWeekly: repeats on the same day each week.\nCustom: pick specific days to repeat on.')}
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

              {recurrence === 'custom' && (
                <View className="gap-2 mt-1">
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
                </View>
              )}
            </View>

            {/* Day (only shown for once/weekly) */}
            {(recurrence === 'none' || recurrence === 'weekly') && (
              <View className="gap-2">
                <Text className="text-text-secondary text-sm font-medium">Day</Text>
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

            {/* Goal */}
            <View className="gap-2">
              <Text className="text-text-secondary text-sm font-medium">Goal (optional)</Text>
              <View className="gap-2">
                <TouchableOpacity
                  onPress={() => setGoalId(null)}
                  className={`px-4 py-3 rounded-xl border ${goalId === null ? 'bg-accent-muted border-accent' : 'bg-surface-raised border-border'}`}
                >
                  <Text className={`text-sm ${goalId === null ? 'text-accent font-medium' : 'text-text-muted'}`}>
                    No goal
                  </Text>
                </TouchableOpacity>
                {goals.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setGoalId(g.id)}
                    className={`px-4 py-3 rounded-xl border ${goalId === g.id ? 'bg-accent-muted border-accent' : 'bg-surface-raised border-border'}`}
                  >
                    <Text className={`text-sm ${goalId === g.id ? 'text-accent font-medium' : 'text-text-primary'}`}>
                      {g.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>

        <View className="px-5 pb-8 pt-4 border-t border-border">
          <Button
            label={mode === 'edit' ? 'Save Changes' : `Add Task · +${xpForDiff} XP`}
            onPress={handleSubmit}
            loading={loading}
            disabled={!title.trim()}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}
