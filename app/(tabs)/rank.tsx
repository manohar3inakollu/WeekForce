import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/hooks/useUser';
import { RANKS, getRankById, getNextRank, TRACK_COLORS, TRACK_LABELS } from '@/constants/ranks';
import { RankBadge } from '@/components/rank/RankBadge';
import { XPBar } from '@/components/home/XPBar';
import { formatXP } from '@/lib/utils';
import { Rank } from '@/types';

function RankRow({ rank, currentRankId }: { rank: Rank; currentRankId: number }) {
  const isCurrent = rank.id === currentRankId;
  const isAchieved = rank.id < currentRankId;
  const color = TRACK_COLORS[rank.track];

  return (
    <View
      style={{
        borderLeftWidth: isCurrent ? 3 : 0,
        borderLeftColor: color,
      }}
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
          width: 36, height: 36, borderRadius: 18,
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

      {isCurrent && (
        <View style={{ backgroundColor: color + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color, fontSize: 11, fontWeight: '600' }}>Current</Text>
        </View>
      )}
    </View>
  );
}

export default function RankScreen() {
  const { data: user, isLoading, refetch } = useUser();
  const currentRank = user ? getRankById(user.rank_id) : getRankById(1);
  const nextRank = getNextRank(currentRank.id);
  const rankColor = TRACK_COLORS[currentRank.track];

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
        {/* Hero card */}
        <View className="rounded-2xl overflow-hidden border border-border">
          <LinearGradient
            colors={['#1a1a2e', '#222228']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20, gap: 20 }}
          >
            {/* Badge + title centered */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              <RankBadge rank={currentRank} size="lg" showTrack />
            </View>

            {/* XP bar — full width */}
            <View style={{ width: '100%' }}>
              <XPBar currentXP={user?.xp_total ?? 0} currentRank={currentRank} />
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 0 }}>
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 22 }}>
                  {formatXP(user?.xp_total ?? 0)}
                </Text>
                <Text style={{ color: '#55556A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total XP
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#2A2A32', marginHorizontal: 8 }} />
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#F0F0F5', fontWeight: '700', fontSize: 22 }}>
                  {user?.qualifying_days_total ?? 0}
                </Text>
                <Text style={{ color: '#55556A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Qual. Days
                </Text>
              </View>
              {nextRank && (
                <>
                  <View style={{ width: 1, backgroundColor: '#2A2A32', marginHorizontal: 8 }} />
                  <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: rankColor, fontWeight: '700', fontSize: 22 }}>
                      {Math.max(0, nextRank.qualifying_days - (user?.qualifying_days_total ?? 0))}
                    </Text>
                    <Text style={{ color: '#55556A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      To {nextRank.title}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Rank ladder */}
        {tracks.map((track) => (
          <View key={track.key} className="gap-2">
            <View className="flex-row items-center gap-2 px-1">
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
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
