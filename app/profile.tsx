import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useUser, useUpdateUser, useResetProgress, useDeleteAccount } from '@/hooks/useUser';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TimePicker } from '@/components/ui/TimePicker';
import { DailyXPTarget } from '@/types';

const TARGET_OPTIONS: { value: DailyXPTarget; label: string; description: string }[] = [
  { value: 'casual', label: 'Casual', description: '20 XP / day' },
  { value: 'regular', label: 'Regular', description: '50 XP / day' },
  { value: 'active', label: 'Active', description: '100 XP / day' },
  { value: 'hardcore', label: 'Hardcore', description: '200 XP / day' },
];

export default function ProfileScreen() {
  const { data: user } = useUser();
  const updateUser = useUpdateUser();
  const resetProgress = useResetProgress();
  const deleteAccount = useDeleteAccount();
  const { prefs, loading: notifLoading, toggleEnabled, toggleDailyReminder, setDailyReminderTime, toggleTaskReminders } = useNotifications();
  const clear = useAuthStore((s) => s.clear);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name ?? '');
  const [target, setTarget] = useState<DailyXPTarget>(user?.daily_xp_target ?? 'regular');

  const initials = (user?.full_name ?? '?').charAt(0).toUpperCase();

  const handleSave = async () => {
    await updateUser.mutateAsync({ full_name: name, daily_xp_target: target });
    setEditing(false);
    Alert.alert('Saved', 'Your profile has been updated.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clear();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This will permanently delete all your data — XP, tasks, goals, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'Your account and all data will be deleted forever.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete my account',
                style: 'destructive',
                onPress: () => deleteAccount.mutate(undefined, { onSuccess: () => router.replace('/') }),
              },
            ]),
        },
      ],
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset all progress?',
      'This will permanently erase all XP, rank, qualifying days, task completions, and weekly history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset Everything',
                style: 'destructive',
                onPress: () => resetProgress.mutate(),
              },
            ]),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-4 border-b border-border flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#5B5EF4" />
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-bold">Profile & Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
        {/* Avatar section */}
        <View className="items-center gap-3 pb-2">
          <View
            style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#5B5EF4' + '66', backgroundColor: '#2A2B5E' }}
            className="items-center justify-center"
          >
            <Text style={{ color: '#A0A3FF', fontSize: 28, fontWeight: '700' }}>{initials}</Text>
          </View>
          <View className="items-center gap-0.5">
            <Text className="text-text-primary text-xl font-bold">{user?.full_name ?? '—'}</Text>
            <Text className="text-text-secondary text-sm">{user?.email ?? '—'}</Text>
          </View>
        </View>

        {/* Stats card */}
        <View className="bg-surface-overlay border border-border rounded-2xl p-5">
          <Text className="text-text-muted text-xs font-semibold tracking-widest uppercase mb-4">Stats</Text>
          <View className="flex-row">
            <View className="flex-1 items-center gap-1">
              <Text className="text-xp font-bold text-3xl">{user?.xp_total ?? 0}</Text>
              <Text className="text-text-muted text-xs uppercase tracking-widest">Total XP</Text>
            </View>
            <View style={{ width: 1 }} className="bg-border mx-2" />
            <TouchableOpacity
              className="flex-1 items-center gap-1"
              onPress={() => Alert.alert('Qualifying Days', 'Days where you hit your Daily XP target. These count toward rank progression — each rank requires a minimum number of qualifying days in addition to total XP.')}
              activeOpacity={0.7}
            >
              <Text className="text-text-primary font-bold text-3xl">{user?.qualifying_days_total ?? 0}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text className="text-text-muted text-xs uppercase tracking-widest">Qual. Days</Text>
                <Ionicons name="information-circle-outline" size={11} color="#44445A" />
              </View>
            </TouchableOpacity>
            <View style={{ width: 1 }} className="bg-border mx-2" />
            <View className="flex-1 items-center gap-1">
              <Text className="text-accent font-bold text-3xl">#{user?.rank_id ?? 1}</Text>
              <Text className="text-text-muted text-xs uppercase tracking-widest">Rank</Text>
            </View>
          </View>
        </View>

        {/* Account card */}
        <View className="bg-surface-overlay border border-border rounded-2xl p-5 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary font-semibold text-base">Account</Text>
            {!editing && (
              <TouchableOpacity onPress={() => { setName(user?.full_name ?? ''); setEditing(true); }}>
                <Text className="text-accent text-sm">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!editing && (
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#5B5EF418', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="compass-outline" size={16} color="#5B5EF4" />
                </View>
                <View>
                  <Text className="text-text-primary text-sm font-medium">App Walkthrough</Text>
                  <Text className="text-text-muted text-xs">Redo full setup — goals, habits & XP target</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#55556A" />
            </TouchableOpacity>
          )}

          {editing ? (
            <View className="gap-4">
              <Input
                label="Full name"
                required
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View className="gap-2">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text className="text-text-secondary text-sm font-medium">Daily XP target</Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Daily XP Target', 'Your goal for XP earned per day. Reach it to count the day as a "qualifying day", which contributes toward rank progression.\n\nCasual: 20 XP / day\nRegular: 50 XP / day\nActive: 100 XP / day\nHardcore: 200 XP / day')}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="information-circle-outline" size={15} color="#55556A" />
                  </TouchableOpacity>
                </View>
                {TARGET_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTarget(opt.value)}
                    className={`px-4 py-3 rounded-xl border flex-row items-center justify-between ${target === opt.value ? 'bg-accent-muted border-accent' : 'bg-surface-raised border-border'}`}
                  >
                    <Text className={`text-sm font-medium ${target === opt.value ? 'text-accent' : 'text-text-primary'}`}>
                      {opt.label}
                    </Text>
                    <Text className={`text-xs ${target === opt.value ? 'text-accent' : 'text-text-muted'}`}>
                      {opt.description}
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
                <Text className="text-text-secondary text-sm">Daily XP target</Text>
                <Text className="text-text-primary text-sm capitalize">{user?.daily_xp_target ?? 'regular'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notifications */}
        {!notifLoading && (
          <View className="bg-surface-overlay border border-border rounded-2xl p-5 gap-4">
            <Text className="text-text-primary font-semibold text-base">Notifications</Text>

            <View className="flex-row items-center justify-between">
              <View className="gap-0.5 flex-1 mr-3">
                <Text className="text-text-primary text-sm font-medium">Enable notifications</Text>
                <Text className="text-text-muted text-xs">Get reminders to stay on track</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={toggleEnabled}
                trackColor={{ false: '#2A2A32', true: '#5B5EF4' }}
                thumbColor="#fff"
              />
            </View>

            {prefs.enabled && (
              <>
                <View style={{ height: 1, backgroundColor: '#2A2A32' }} />

                <View className="flex-row items-center justify-between">
                  <View className="gap-0.5 flex-1 mr-3">
                    <Text className="text-text-primary text-sm font-medium">Daily reminder</Text>
                    <Text className="text-text-muted text-xs">A nudge each day to check your plan</Text>
                  </View>
                  <Switch
                    value={prefs.dailyReminder}
                    onValueChange={toggleDailyReminder}
                    trackColor={{ false: '#2A2A32', true: '#5B5EF4' }}
                    thumbColor="#fff"
                  />
                </View>

                {prefs.dailyReminder && (
                  <TimePicker
                    label="Reminder time"
                    value={prefs.dailyReminderTime}
                    onChange={(t) => t && setDailyReminderTime(t)}
                  />
                )}

                <View style={{ height: 1, backgroundColor: '#2A2A32' }} />

                <View className="flex-row items-center justify-between">
                  <View className="gap-0.5 flex-1 mr-3">
                    <Text className="text-text-primary text-sm font-medium">Task reminders</Text>
                    <Text className="text-text-muted text-xs">Notify when a task's start time arrives</Text>
                  </View>
                  <Switch
                    value={prefs.taskReminders}
                    onValueChange={toggleTaskReminders}
                    trackColor={{ false: '#2A2A32', true: '#5B5EF4' }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>
        )}

        {/* Danger Zone */}
        <View style={{ backgroundColor: '#1A1A22', borderWidth: 1, borderColor: '#2A2A32', borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A32' }}>
            <Text style={{ color: '#55556A', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>Danger Zone</Text>
          </View>

          <TouchableOpacity
            onPress={handleReset}
            disabled={resetProgress.isPending}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, opacity: resetProgress.isPending ? 0.5 : 1 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8717112', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-undo-outline" size={18} color="#F87171" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F87171', fontWeight: '600', fontSize: 14 }}>
                {resetProgress.isPending ? 'Resetting…' : 'Reset Progress'}
              </Text>
              <Text style={{ color: '#55556A', fontSize: 12, marginTop: 2 }}>
                Wipes XP, rank, tasks and history
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#55556A" />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: '#2A2A32', marginHorizontal: 16 }} />

          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deleteAccount.isPending}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, opacity: deleteAccount.isPending ? 0.5 : 1 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8717112', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={18} color="#F87171" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F87171', fontWeight: '600', fontSize: 14 }}>
                {deleteAccount.isPending ? 'Deleting…' : 'Delete Account'}
              </Text>
              <Text style={{ color: '#55556A', fontSize: 12, marginTop: 2 }}>
                Permanently removes your account and all data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#55556A" />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            backgroundColor: '#1A1A22',
            borderWidth: 1,
            borderColor: '#2A2A32',
            borderRadius: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#8888A0" />
          <Text style={{ color: '#C8C8E0', fontWeight: '600', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
