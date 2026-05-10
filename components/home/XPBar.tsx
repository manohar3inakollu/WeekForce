import React from 'react';
import { View, Text } from 'react-native';
import { Rank } from '@/types';
import { formatXP, clamp } from '@/lib/utils';
import { getNextRank } from '@/constants/ranks';
import { TRACK_COLORS } from '@/constants/ranks';

interface XPBarProps {
  currentXP: number;
  currentRank: Rank;
}

export function XPBar({ currentXP, currentRank }: XPBarProps) {
  const nextRank = getNextRank(currentRank.id);
  const fromXP = currentRank.min_xp;
  const toXP = nextRank?.min_xp ?? currentXP;
  const progress = nextRank ? clamp((currentXP - fromXP) / (toXP - fromXP), 0, 1) : 1;
  const color = TRACK_COLORS[currentRank.track];

  return (
    <View className="gap-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-text-secondary text-xs">
          {formatXP(currentXP)} XP
        </Text>
        {nextRank ? (
          <Text className="text-text-secondary text-xs">
            {formatXP(toXP - currentXP)} to {nextRank.title}
          </Text>
        ) : (
          <Text className="text-text-secondary text-xs">Max rank</Text>
        )}
      </View>
      <View className="h-2 bg-surface-overlay rounded-full overflow-hidden">
        <View
          style={{ width: `${progress * 100}%`, backgroundColor: color }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
