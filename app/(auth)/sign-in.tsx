import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    try {
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) return;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) throw sessionError;
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setOauthLoading(null);
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
            <Text className="text-text-primary text-4xl font-bold tracking-tight">WeekForce</Text>
            <Text className="text-text-secondary text-base">Sign in to your account</Text>
          </View>

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
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Forgot email?',
                  'Check the inbox of any email you may have used when signing up. If you still need help, contact support.',
                )
              }
              className="self-end"
            >
              <Text className="text-accent text-sm">Forgot email?</Text>
            </TouchableOpacity>
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              className="self-end"
            >
              <Text className="text-accent text-sm">Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <Button label="Sign In" onPress={handleSignIn} loading={loading} fullWidth />

          {/* Divider */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-text-secondary text-sm">or continue with</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* OAuth buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => handleOAuthSignIn('google')}
              disabled={oauthLoading !== null}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-3 bg-surface-overlay border border-border rounded-xl py-3 px-5 opacity-100 disabled:opacity-50"
            >
              <FontAwesome name="google" size={18} color="#EA4335" />
              <Text className="text-text-primary font-medium text-base">
                {oauthLoading === 'google' ? 'Opening…' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOAuthSignIn('apple')}
              disabled={oauthLoading !== null}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-3 bg-surface-overlay border border-border rounded-xl py-3 px-5 opacity-100 disabled:opacity-50"
            >
              <FontAwesome name="apple" size={20} color="#FFFFFF" />
              <Text className="text-text-primary font-medium text-base">
                {oauthLoading === 'apple' ? 'Opening…' : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-text-secondary text-sm">Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text className="text-accent text-sm font-semibold">Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
