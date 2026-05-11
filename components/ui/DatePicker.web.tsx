import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
}

export function DatePicker({ label, value, onChange, placeholder = 'Set due date' }: DatePickerProps) {
  const displayValue =
    value && isValid(parseISO(value)) ? format(parseISO(value), 'MMM d, yyyy') : placeholder;

  return (
    <View style={{ gap: 4 }}>
      {label && (
        <Text style={{ color: '#8888A0', fontSize: 14, fontWeight: '500' }}>{label}</Text>
      )}
      <View style={{ position: 'relative' }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#2A2A32',
            backgroundColor: '#18181C',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: value ? '#E8E8F0' : '#55556A', fontSize: 14 }}>
            {displayValue}
          </Text>
          <Ionicons name="calendar-outline" size={16} color="#8888A0" />
        </View>
        {React.createElement('input', {
          type: 'date',
          value: value ?? '',
          onChange: (e: any) => onChange((e.target as any).value || null),
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
          },
        })}
      </View>
    </View>
  );
}
