import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { CATEGORIES, DIFFICULTIES } from '@/constants/xp';
import { GoalCategory, Difficulty } from '@/types';

interface GoalFormData {
  title: string;
  description?: string;
  category: GoalCategory;
  due_date: string | null;
  difficulty: Difficulty;
}

interface GoalFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => void;
  loading?: boolean;
  initial?: { title: string; description?: string | null; category: GoalCategory; due_date?: string | null; difficulty?: Difficulty };
  mode?: 'create' | 'edit';
}

export function GoalForm({
  visible, onClose, onSubmit, loading, initial, mode = 'create',
}: GoalFormProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<GoalCategory>(initial?.category ?? 'work');
  const [dueDate, setDueDate] = useState<string | null>(initial?.due_date ?? null);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medium');

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setCategory(initial?.category ?? 'work');
      setDueDate(initial?.due_date ?? null);
      setDifficulty(initial?.difficulty ?? 'medium');
    }
  }, [visible, initial]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      due_date: dueDate,
      difficulty,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            <Input
              label="Title"
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

            <DatePicker label="Due date (optional)" value={dueDate} onChange={setDueDate} />

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

            {/* Category */}
            <View className="gap-2">
              <Text className="text-text-secondary text-sm font-medium">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value as GoalCategory)}
                    style={{
                      borderColor: category === cat.value ? cat.color : '#2A2A32',
                      backgroundColor: category === cat.value ? cat.color + '22' : '#18181C',
                    }}
                    className="px-4 py-2 rounded-xl border"
                  >
                    <Text
                      style={{ color: category === cat.value ? cat.color : '#8888A0' }}
                      className="text-sm font-medium"
                    >
                      {cat.label}
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
            label={mode === 'create' ? 'Create Goal' : 'Save Changes'}
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
