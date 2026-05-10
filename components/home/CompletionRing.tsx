import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { clamp } from '@/lib/utils';

interface CompletionRingProps {
  completed: number;
  total: number;
  size?: number;
}

export function CompletionRing({ completed, total, size = 80 }: CompletionRingProps) {
  const pct = total > 0 ? clamp(completed / total, 0, 1) : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E1E24"
          strokeWidth={8}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#5B5EF4"
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-text-primary font-bold text-lg">{Math.round(pct * 100)}%</Text>
        <Text className="text-text-muted text-xs">{completed}/{total}</Text>
      </View>
    </View>
  );
}
