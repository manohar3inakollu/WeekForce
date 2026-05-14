import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { isBefore, parseISO } from 'date-fns';
import { DIFFICULTIES } from '@/constants/xp';
import { GoalCategory, Difficulty, Milestone } from '@/types';

interface GoalFormData {
  title: string;
  description?: string;
  category: GoalCategory;
  start_date: string | null;
  due_date: string | null;
  difficulty: Difficulty;
  milestone_id?: string | null;
}

interface GoalFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => void;
  loading?: boolean;
  errorMessage?: string | null;
  milestones?: Milestone[];
  initial?: {
    title: string;
    description?: string | null;
    category: GoalCategory;
    start_date?: string | null;
    due_date?: string | null;
    difficulty?: Difficulty;
    milestone_id?: string | null;
  };
  mode?: 'create' | 'edit';
}

export function GoalForm({
  visible, onClose, onSubmit, loading, errorMessage, milestones = [], initial, mode = 'create',
}: GoalFormProps) {
  const insets = useSafeAreaInsets();
  const [title,       setTitle]       = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startDate,   setStartDate]   = useState<string | null>(initial?.start_date ?? null);
  const [dueDate,     setDueDate]     = useState<string | null>(initial?.due_date ?? null);
  const [difficulty,  setDifficulty]  = useState<Difficulty>(initial?.difficulty ?? 'medium');
  const [milestoneId, setMilestoneId] = useState<string | null>(initial?.milestone_id ?? null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const category: GoalCategory =
    milestones.find((m) => m.id === milestoneId)?.category ?? initial?.category ?? 'other';

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setStartDate(initial?.start_date ?? null);
      setDueDate(initial?.due_date ?? null);
      setDifficulty(initial?.difficulty ?? 'medium');
      setMilestoneId(initial?.milestone_id ?? null);
      setSubmitAttempted(false);
    }
  }, [visible, initial]);

  const canSubmit = !!title.trim() && !!startDate && !!dueDate && isBefore(parseISO(startDate), parseISO(dueDate));

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      start_date: startDate,
      due_date: dueDate,
      difficulty,
      milestone_id: milestoneId,
    });
  };

  const activeMilestones = milestones.filter((m) => m.status === 'active');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-border">
          <Text className="text-text-primary text-lg font-semibold">
            {mode === 'create' ? 'New Goal' : 'Edit Goal'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-text-secondary text-base">Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled">
          <View className="gap-5">
            {/* Definition */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#22C55E12', borderWidth: 1, borderColor: '#22C55E33', borderRadius: 14, padding: 14 }}>
              <Ionicons name="flag-outline" size={16} color="#22C55E" style={{ marginTop: 1, flexShrink: 0 }} />
              <Text style={{ color: '#8888AA', fontSize: 12, flex: 1, lineHeight: 18 }}>
                Goals are concrete objectives with a start and end date. They sit under a Milestone and break big ambitions into achievable steps.
              </Text>
            </View>

            <Input
              label="Title"
              required
              placeholder="What do you want to achieve?"
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={100}
            />
            <Input
              label="Description (optional)"
              placeholder="Add more context..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 72 }}
            />

            {/* Date range — required */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text className="text-text-secondary text-sm font-medium">Date range</Text>
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', lineHeight: 18 }}>*</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Date range', 'Start date: when you plan to begin working on this goal.\nDue date: the deadline — goals past their due date are flagged overdue.\n\nBoth are required so progress can be tracked on the timeline.')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DatePicker label="Start date" required value={startDate} onChange={setStartDate} />
                </View>
                <View style={{ flex: 1 }}>
                  <DatePicker label="Due date" required value={dueDate} onChange={setDueDate} />
                </View>
              </View>
              {submitAttempted && !startDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Start date is required.</Text>
              )}
              {submitAttempted && !dueDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Due date is required.</Text>
              )}
              {startDate && dueDate && !isBefore(parseISO(startDate), parseISO(dueDate)) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Due date must be after start date.</Text>
              )}
            </View>

            {/* Difficulty */}
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary text-sm font-medium">Difficulty</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Difficulty',
                    'Sets how much XP you earn on completion.\n\nEasy: 50 XP\nMedium: 100 XP\nHard: 200 XP\nEpic: 400 XP',
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
                      +{d.goalXp} XP
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Milestone */}
            <View className="gap-2">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text className="text-text-secondary text-sm font-medium">Milestone</Text>
                <Text style={{ color: '#55556A', fontSize: 12 }}>(optional)</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Milestone', 'Link this goal to a Milestone you\'re working towards. Milestones are big multi-month objectives — goals ladder up to them.\n\nLeave as "No Milestone" if this goal stands on its own.')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setMilestoneId(null)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                    borderColor: milestoneId === null ? '#5B5EF4' : '#2A2A32',
                    backgroundColor: milestoneId === null ? '#5B5EF422' : '#18181C',
                  }}
                >
                  <Text style={{ color: milestoneId === null ? '#5B5EF4' : '#8888A0', fontSize: 13, fontWeight: '500' }}>
                    No Milestone
                  </Text>
                </TouchableOpacity>
                {activeMilestones.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMilestoneId(m.id)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                      borderColor: milestoneId === m.id ? '#5B5EF4' : '#2A2A32',
                      backgroundColor: milestoneId === m.id ? '#5B5EF422' : '#18181C',
                      maxWidth: 220,
                    }}
                  >
                    <Text
                      style={{ color: milestoneId === m.id ? '#5B5EF4' : '#8888A0', fontSize: 13, fontWeight: '500' }}
                      numberOfLines={1}
                    >
                      {m.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
          <View style={{ height: 32 }} />
        </ScrollView>

        <View className="px-5 pb-8 pt-4 border-t border-border">
          {!!errorMessage && (
            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
              {errorMessage}
            </Text>
          )}
          <Button
            label={mode === 'create' ? 'Create Goal' : 'Save Changes'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            fullWidth
          />
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
