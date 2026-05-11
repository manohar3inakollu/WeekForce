import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { useUIStore } from '@/store/ui';

export function WeekNav() {
  const weekStart = useUIStore((s) => s.selectedWeekStart);
  const setSelectedWeekStart = useUIStore((s) => s.setSelectedWeekStart);

  const goBack = () =>
    setSelectedWeekStart(format(subDays(parseISO(weekStart), 7), 'yyyy-MM-dd'));
  const goNext = () =>
    setSelectedWeekStart(format(addDays(parseISO(weekStart), 7), 'yyyy-MM-dd'));

  const weekEnd = addDays(parseISO(weekStart), 6);
  const label = `${format(parseISO(weekStart), 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

  return (
    <View className="flex-row items-center gap-1">
      <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={18} color="#8888A0" />
      </TouchableOpacity>
      <Text className="text-text-secondary text-sm px-1">{label}</Text>
      <TouchableOpacity onPress={goNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-forward" size={18} color="#8888A0" />
      </TouchableOpacity>
    </View>
  );
}
