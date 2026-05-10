import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DAYS_OF_WEEK } from '@/constants/xp';
import { DayOfWeek, Goal } from '@/types';

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; scheduled_day: DayOfWeek; goal_id: string }) => void;
  loading?: boolean;
  goals: Goal[];
  defaultDay?: DayOfWeek;
  defaultGoalId?: string;
}

export function TaskForm({
  visible,
  onClose,
  onSubmit,
  loading,
  goals,
  defaultDay = 'Mon',
  defaultGoalId,
}: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [goalId, setGoalId] = useState(defaultGoalId ?? goals[0]?.id ?? '');

  const handleSubmit = () => {
    if (!title.trim() || !goalId) return;
    onSubmit({ title: title.trim(), scheduled_day: day, goal_id: goalId });
    setTitle('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-surface pt-4">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-border">
          <Text className="text-text-primary text-lg font-semibold">New Task</Text>
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

            {goals.length > 0 && (
              <View className="gap-2">
                <Text className="text-text-secondary text-sm font-medium">Goal</Text>
                <View className="gap-2">
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
            )}
          </View>
        </ScrollView>

        <View className="px-5 pb-8 pt-4 border-t border-border">
          <Button
            label="Add Task"
            onPress={handleSubmit}
            loading={loading}
            disabled={!title.trim() || !goalId}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}
