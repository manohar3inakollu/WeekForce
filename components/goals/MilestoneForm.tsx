import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { isBefore, parseISO } from 'date-fns';
import { CATEGORIES, DIFFICULTIES } from '@/constants/xp';
import { GoalCategory, Difficulty, Milestone } from '@/types';

export interface MilestoneFormData {
  title: string;
  description?: string;
  category: GoalCategory;
  start_date: string | null;
  due_date: string | null;
  difficulty: Difficulty;
}

interface MilestoneFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: MilestoneFormData) => void;
  loading?: boolean;
  initial?: Milestone;
  mode?: 'create' | 'edit';
}

export function MilestoneForm({ visible, onClose, onSubmit, loading, initial, mode = 'create' }: MilestoneFormProps) {
  const insets = useSafeAreaInsets();
  const [title,       setTitle]      = useState(initial?.title ?? '');
  const [description, setDescription]= useState(initial?.description ?? '');
  const [category,    setCategory]   = useState<GoalCategory>(initial?.category ?? 'personal');
  const [startDate,   setStartDate]  = useState<string | null>(initial?.start_date ?? null);
  const [dueDate,     setDueDate]    = useState<string | null>(initial?.due_date ?? null);
  const [difficulty,  setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medium');

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setCategory(initial?.category ?? 'personal');
      setStartDate(initial?.start_date ?? null);
      setDueDate(initial?.due_date ?? null);
      setDifficulty(initial?.difficulty ?? 'medium');
    }
  }, [visible, initial]);

  const canSubmit = !!title.trim() && !!startDate && !!dueDate &&
    isBefore(parseISO(startDate), parseISO(dueDate));

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      start_date: startDate,
      due_date: dueDate,
      difficulty,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: '#0b0b14', paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#252535' }}>
          <Text style={{ color: '#E8E8F2', fontSize: 18, fontWeight: '700' }}>
            {mode === 'create' ? 'New Milestone' : 'Edit Milestone'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#8888AA', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 20 }}>
            {/* Info note */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#5B5EF412', borderWidth: 1, borderColor: '#5B5EF433', borderRadius: 14, padding: 14 }}>
              <Ionicons name="trophy-outline" size={16} color="#5B5EF4" style={{ marginTop: 1, flexShrink: 0 }} />
              <Text style={{ color: '#8888AA', fontSize: 12, flex: 1, lineHeight: 18 }}>
                Milestones are big life objectives that span months. Goals and tasks ladder up to them.
              </Text>
            </View>

            <Input
              label="Title"
              required
              placeholder="e.g. Run a marathon"
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={120}
            />

            <Input
              label="Description (optional)"
              placeholder="Why does this milestone matter?"
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
                <Text style={{ color: '#8888AA', fontSize: 13, fontWeight: '600' }}>Date range</Text>
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', lineHeight: 18 }}>*</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Date range', 'Start date: when you plan to begin this milestone.\nTarget date: the deadline — sets the timeline and counts down days remaining.\n\nBoth are required to show progress in the timeline bar.')}
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
                  <DatePicker label="Target date" required value={dueDate} onChange={setDueDate} />
                </View>
              </View>
              {startDate && dueDate && !isBefore(parseISO(startDate), parseISO(dueDate)) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Target date must be after start date.</Text>
              )}
            </View>

            {/* Ambition (difficulty) */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#8888AA', fontSize: 13, fontWeight: '600' }}>Difficulty</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Difficulty', 'How ambitious is this milestone? Sets the XP reward on completion.\n\nEasy: 500 XP\nMedium: 1,000 XP\nHard: 2,000 XP\nEpic: 5,000 XP')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => setDifficulty(d.value as Difficulty)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', gap: 2,
                      borderWidth: 1,
                      borderColor: difficulty === d.value ? d.color : '#2A2A32',
                      backgroundColor: difficulty === d.value ? d.color + '22' : '#13131e',
                    }}
                  >
                    <Text style={{ color: difficulty === d.value ? d.color : '#55556A', fontSize: 12, fontWeight: '600' }}>
                      {d.label}
                    </Text>
                    <Text style={{ color: difficulty === d.value ? d.color : '#55556A', fontSize: 11 }}>
                      +{d.milestoneXp} XP
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ color: '#8888AA', fontSize: 13, fontWeight: '600' }}>Category</Text>
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', lineHeight: 18 }}>*</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value as GoalCategory)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                      borderColor: category === cat.value ? cat.color : '#2A2A32',
                      backgroundColor: category === cat.value ? cat.color + '22' : '#13131e',
                    }}
                  >
                    <Text style={{ color: category === cat.value ? cat.color : '#8888A0', fontSize: 13, fontWeight: '600' }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#252535' }}>
          <Button
            label={mode === 'create' ? 'Create Milestone' : 'Save Changes'}
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
