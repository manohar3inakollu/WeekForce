import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/hooks/useUser';
import { RANKS, getRankById, getNextRank, TRACK_COLORS, TRACK_LABELS } from '@/constants/ranks';
import { RankBadge } from '@/components/rank/RankBadge';
import { XPBar } from '@/components/home/XPBar';
import { formatXP, clamp } from '@/lib/utils';
import { Rank } from '@/types';

function RankRow({ rank, currentRankId, xp, qualifyingDays }: { rank: Rank; currentRankId: number; xp: number; qualifyingDays: number }) {
  const isCurrent = rank.id === currentRankId;
  const isAchieved = rank.id < currentRankId;
  const color = TRACK_COLORS[rank.track];

  return (
    <View
      className={`flex-row items-center px-4 py-3 rounded-xl border gap-3 ${
        isCurrent
          ? 'border-accent bg-accent-muted'
          : isAchieved
          ? 'border-border-subtle bg-surface-raised'
          : 'border-border-subtle bg-surface'
      }`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isAchieved || isCurrent ? color + '22' : '#1E1E24',
          borderColor: isAchieved || isCurrent ? color + '66' : '#2A2A32',
          borderWidth: 1,
        }}
        className="items-center justify-center"
      >
        {isAchieved ? (
          <Ionicons name="checkmark" size={16} color={color} />
        ) : (
          <Text style={{ color: isCurrent ? color : '#55556A' }} className="text-xs font-bold">
            {rank.id}
          </Text>
        )}
      </View>

      <View className="flex-1">
        <Text
          style={{ color: isCurrent ? color : isAchieved ? color + 'BB' : '#8888A0' }}
          className="font-semibold text-sm"
        >
          {rank.title}
          {isCurrent && ' ← you are here'}
        </Text>
        <Text className="text-text-muted text-xs">
          {formatXP(rank.min_xp)} XP · {rank.qualifying_days} days
        </Text>
      </View>
    </View>
  );
}

export default function RankScreen() {
  const { data: user, isLoading, refetch } = useUser();
  const currentRank = user ? getRankById(user.rank_id) : getRankById(1);
  const nextRank = getNextRank(currentRank.id);

  const tracks = [
    { key: 'starter', label: 'Starter Track', ranks: RANKS.filter((r) => r.track === 'starter') },
    { key: 'specialist', label: 'Specialist Track', ranks: RANKS.filter((r) => r.track === 'specialist') },
    { key: 'leader', label: 'Leader Track', ranks: RANKS.filter((r) => r.track === 'leader') },
    { key: 'prestige', label: 'Prestige', ranks: RANKS.filter((r) => r.track === 'prestige') },
  ];

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 border-b border-border">
        <Text className="text-text-primary text-2xl font-bold">Rank</Text>
        <Text className="text-text-secondary text-sm">Your progression through 25 ranks</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5B5EF4" />
        }
      >
        {/* Current rank hero */}
        <View className="bg-surface-overlay border border-border rounded-2xl p-5 items-center gap-4">
          <RankBadge rank={currentRank} size="lg" showTrack />
          <XPBar currentXP={user?.xp_total ?? 0} currentRank={currentRank} />
          <View className="flex-row gap-6">
            <View className="items-center gap-0.5">
              <Text className="text-xp font-bold text-lg">{formatXP(user?.xp_total ?? 0)}</Text>
              <Text className="text-text-muted text-xs">Total XP</Text>
            </View>
            <View className="items-center gap-0.5">
              <Text className="text-text-primary font-bold text-lg">
                {user?.qualifying_days_total ?? 0}
              </Text>
              <Text className="text-text-muted text-xs">Qualifying days</Text>
            </View>
            {nextRank && (
              <View className="items-center gap-0.5">
                <Text className="text-accent font-bold text-lg">
                  {Math.max(0, nextRank.qualifying_days - (user?.qualifying_days_total ?? 0))}
                </Text>
                <Text className="text-text-muted text-xs">Days to {nextRank.title}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Rank ladder */}
        {tracks.map((track) => (
          <View key={track.key} className="gap-2">
            <View className="flex-row items-center gap-2">
              <View
                style={{ backgroundColor: TRACK_COLORS[track.key as keyof typeof TRACK_COLORS] }}
                className="w-2 h-2 rounded-full"
              />
              <Text className="text-text-secondary text-sm font-semibold">{track.label}</Text>
            </View>
            <View className="gap-1.5">
              {track.ranks.map((rank) => (
                <RankRow
                  key={rank.id}
                  rank={rank}
                  currentRankId={currentRank.id}
                  xp={user?.xp_total ?? 0}
                  qualifyingDays={user?.qualifying_days_total ?? 0}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
