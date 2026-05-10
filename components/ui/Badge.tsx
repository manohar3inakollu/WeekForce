import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color = '#5B5EF4', size = 'sm' }: BadgeProps) {
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View
      style={{ backgroundColor: color + '22', borderColor: color + '55', borderWidth: 1 }}
      className={`${pad} rounded-full`}
    >
      <Text style={{ color }} className={`${fontSize} font-medium`}>
        {label}
      </Text>
    </View>
  );
}
