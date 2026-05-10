import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface px-6 pt-20 pb-8"
    >
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Text className="text-accent text-base">← Back</Text>
      </TouchableOpacity>

      <View className="gap-8">
        <View className="gap-2">
          <Text className="text-text-primary text-3xl font-bold">Reset password</Text>
          <Text className="text-text-secondary text-base">
            Enter your email and we'll send a reset link.
          </Text>
        </View>

        {sent ? (
          <View className="bg-surface-overlay border border-border rounded-2xl p-5">
            <Text className="text-success text-base font-semibold mb-1">Email sent!</Text>
            <Text className="text-text-secondary text-sm">
              Check your inbox for a password reset link.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Button
              label="Send reset link"
              onPress={handleReset}
              loading={loading}
              disabled={!email.trim()}
              fullWidth
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
