import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: email.trim(),
          full_name: name.trim(),
          xp_total: 0,
          qualifying_days_total: 0,
          rank_id: 1,
          daily_xp_target: 'regular',
        });
        router.replace('/onboarding');
      }
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-8 gap-8">
          <View className="gap-2">
            <Text className="text-text-primary text-4xl font-bold tracking-tight">Get started</Text>
            <Text className="text-text-secondary text-base">Create your WeekForce account</Text>
          </View>

          <View className="gap-4">
            <Input
              label="Full name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <Button
            label="Create Account"
            onPress={handleSignUp}
            loading={loading}
            disabled={!name.trim() || !email.trim() || password.length < 6}
            fullWidth
          />

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-text-secondary text-sm">Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-accent text-sm font-semibold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
