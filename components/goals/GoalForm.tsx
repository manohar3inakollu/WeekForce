import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/constants/xp';
import { GoalCategory } from '@/types';
import { categoryColor } from '@/lib/utils';

interface GoalFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; category: GoalCategory }) => void;
  loading?: boolean;
  initial?: { title: string; description?: string; category: GoalCategory };
  mode?: 'create' | 'edit';
}

export function GoalForm({
  visible,
  onClose,
  onSubmit,
  loading,
  initial,
  mode = 'create',
}: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<GoalCategory>(initial?.category ?? 'work');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() || undefined, category });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-surface pt-4">
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
