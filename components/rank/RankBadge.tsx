import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Rank } from '@/types';
import { TRACK_COLORS, TRACK_LABELS } from '@/constants/ranks';

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  showTrack?: boolean;
}

const iconMap: Record<number, string> = {
  1: 'ellipse-outline', 2: 'shield-outline', 3: 'hammer-outline', 4: 'construct-outline',
  5: 'trophy-outline', 6: 'flash-outline', 7: 'eye-outline', 8: 'car-sport-outline',
  9: 'lock-closed-outline', 10: 'cut-outline', 11: 'git-network-outline',
  12: 'map-outline', 13: 'school-outline', 14: 'medal-outline', 15: 'rocket-outline',
  16: 'footsteps-outline', 17: 'compass-outline', 18: 'flag-outline', 19: 'briefcase-outline',
  20: 'telescope-outline', 21: 'star-outline', 22: 'cube-outline', 23: 'diamond-outline',
  24: 'ribbon-outline', 25: 'infinite-outline',
};

export function RankBadge({ rank, size = 'md', showTrack = false }: RankBadgeProps) {
  const color = TRACK_COLORS[rank.track];
  const iconName = (iconMap[rank.id] ?? 'star-outline') as any;

  const containerSize = size === 'sm' ? 36 : size === 'md' ? 52 : 72;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 24 : 32;
  const titleSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl';

  return (
    <View className="items-center gap-2">
      <View
        style={{
          width: containerSize,
          height: containerSize,
          backgroundColor: color + '22',
          borderColor: color + '66',
          borderWidth: 2,
          borderRadius: containerSize / 2,
        }}
        className="items-center justify-center"
      >
        <Ionicons name={iconName} size={iconSize} color={color} />
      </View>
      <View className="items-center gap-0.5">
        <Text style={{ color }} className={`font-bold ${titleSize}`}>
          {rank.title}
        </Text>
        {showTrack && (
          <Text className="text-text-muted text-xs">{TRACK_LABELS[rank.track]}</Text>
        )}
      </View>
    </View>
  );
}
