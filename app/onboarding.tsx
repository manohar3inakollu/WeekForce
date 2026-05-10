import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/constants/xp';
import { DailyXPTarget, DAILY_XP_TARGETS } from '@/types';
import { RANKS } from '@/constants/ranks';
import { RankBadge } from '@/components/rank/RankBadge';

const XP_TARGET_OPTIONS: { value: DailyXPTarget; label: string; desc: string }[] = [
  { value: 'casual', label: 'Casual', desc: '20 XP/day — light touch' },
  { value: 'regular', label: 'Regular', desc: '50 XP/day — steady pace' },
  { value: 'active', label: 'Active', desc: '100 XP/day — serious mode' },
  { value: 'hardcore', label: 'Hardcore', desc: '200 XP/day — full throttle' },
];

export default function Onboarding() {
  const session = useAuthStore((s) => s.session);
  const [target, setTarget] = useState<DailyXPTarget>('regular');
  const [loading, setLoading] = useState(false);
  const beginnerRank = RANKS[0];

  const handleDone = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await supabase
        .from('users')
        .update({ daily_xp_target: target })
        .eq('id', session.user.id);
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      >
        <View className="gap-8">
          <View className="gap-2">
            <Text className="text-text-primary text-3xl font-bold">Welcome to WeekForce</Text>
            <Text className="text-text-secondary text-base">
              Set goals, plan your week, earn XP, and level up.
            </Text>
          </View>

          <View className="items-center py-6">
            <RankBadge rank={beginnerRank} size="lg" showTrack />
            <Text className="text-text-secondary text-sm mt-4 text-center">
              You're starting as a Beginner. Every task completed earns XP and drives you forward.
            </Text>
          </View>

          <View className="gap-3">
            <Text className="text-text-primary font-semibold text-base">Choose your daily pace</Text>
            <Text className="text-text-secondary text-sm">
              A day counts toward your rank only if you hit this target.
            </Text>
            <View className="gap-2.5">
              {XP_TARGET_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setTarget(opt.value)}
                  className={`px-4 py-3.5 rounded-xl border flex-row items-center justify-between ${
                    target === opt.value
                      ? 'bg-accent-muted border-accent'
                      : 'bg-surface-raised border-border'
                  }`}
                >
                  <View>
                    <Text
                      className={`font-semibold text-base ${
                        target === opt.value ? 'text-accent' : 'text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    <Text className="text-text-secondary text-sm">{opt.desc}</Text>
                  </View>
                  {target === opt.value && (
                    <View className="w-5 h-5 rounded-full bg-accent items-center justify-center">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="px-6 pb-10 pt-4 border-t border-border">
        <Button label="Let's go" onPress={handleDone} loading={loading} fullWidth size="lg" />
      </View>
    </View>
  );
}
