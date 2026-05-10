import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useUser, useUpdateUser } from '@/hooks/useUser';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DailyXPTarget, DAILY_XP_TARGETS } from '@/types';

const TARGET_OPTIONS: { value: DailyXPTarget; label: string }[] = [
  { value: 'casual', label: 'Casual (20 XP)' },
  { value: 'regular', label: 'Regular (50 XP)' },
  { value: 'active', label: 'Active (100 XP)' },
  { value: 'hardcore', label: 'Hardcore (200 XP)' },
];

export default function ProfileScreen() {
  const { data: user } = useUser();
  const updateUser = useUpdateUser();
  const clear = useAuthStore((s) => s.clear);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name ?? '');
  const [target, setTarget] = useState<DailyXPTarget>(user?.daily_xp_target ?? 'regular');

  const handleSave = async () => {
    await updateUser.mutateAsync({ full_name: name, daily_xp_target: target });
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          clear();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 border-b border-border flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#5B5EF4" />
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-bold">Profile & Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        <View className="bg-surface-overlay border border-border rounded-2xl p-5 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary font-semibold text-base">Account</Text>
            {!editing && (
              <TouchableOpacity onPress={() => { setName(user?.full_name ?? ''); setEditing(true); }}>
                <Text className="text-accent text-sm">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View className="gap-4">
              <Input
                label="Full name"
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View className="gap-2">
                <Text className="text-text-secondary text-sm font-medium">Daily XP target</Text>
                {TARGET_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTarget(opt.value)}
                    className={`px-4 py-2.5 rounded-xl border ${target === opt.value ? 'bg-accent-muted border-accent' : 'bg-surface-raised border-border'}`}
                  >
                    <Text className={`text-sm ${target === opt.value ? 'text-accent font-medium' : 'text-text-primary'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-3">
                <Button label="Save" onPress={handleSave} loading={updateUser.isPending} />
                <Button label="Cancel" onPress={() => setEditing(false)} variant="secondary" />
              </View>
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-sm">Name</Text>
                <Text className="text-text-primary text-sm">{user?.full_name ?? '—'}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-sm">Email</Text>
                <Text className="text-text-primary text-sm">{user?.email ?? '—'}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-sm">Daily XP target</Text>
                <Text className="text-text-primary text-sm capitalize">{user?.daily_xp_target ?? 'regular'}</Text>
              </View>
            </View>
          )}
        </View>

        <View className="bg-surface-overlay border border-border rounded-2xl p-5 gap-3">
          <Text className="text-text-primary font-semibold text-base">Stats</Text>
          <View className="flex-row justify-between">
            <Text className="text-text-secondary text-sm">Total XP</Text>
            <Text className="text-xp font-semibold text-sm">{user?.xp_total ?? 0}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-text-secondary text-sm">Qualifying days</Text>
            <Text className="text-text-primary text-sm">{user?.qualifying_days_total ?? 0}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-surface-overlay border border-danger/30 rounded-2xl p-4 flex-row items-center gap-3"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-danger font-medium">Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
