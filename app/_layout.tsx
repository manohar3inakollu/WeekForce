import '../global.css';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useSegments, useRootNavigationState, router } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { setupNotificationHandler } from '@/hooks/useNotifications';

setupNotificationHandler();

if (Platform.OS !== 'web') {
  const { StyleSheet } = require('react-native');
  StyleSheet.setFlag?.('darkMode', 'class');
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}


function NavigationGuard() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key || !initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Signed in but still on auth screen — go to routing index
      router.replace('/');
    } else if (!session && !inAuthGroup && segments[0] !== undefined) {
      // Signed out but not on auth screen — redirect to sign-in
      router.replace('/(auth)/sign-in');
    }
  }, [session, initialized, segments, navState?.key]);

  return null;
}

async function handleOAuthUrl(url: string) {
  if (!url) return;
  if (url.includes('access_token=')) {
    const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
    const params = new URLSearchParams(fragment ?? '');
    const access_token = params.get('access_token') ?? '';
    const refresh_token = params.get('refresh_token') ?? '';
    if (access_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
  }
}

async function loadOnboarded(userId: string, setOnboarded: (v: boolean) => void) {
  const val = await AsyncStorage.getItem(`onboarded_${userId}`);
  if (val === 'true') {
    setOnboarded(true);
    return;
  }
  // AsyncStorage may be empty on a fresh install or new build variant — check DB
  const { data } = await supabase
    .from('users')
    .select('onboarded')
    .eq('id', userId)
    .single();
  const dbOnboarded = data?.onboarded === true;
  if (dbOnboarded) {
    // Backfill local cache so subsequent launches are instant
    await AsyncStorage.setItem(`onboarded_${userId}`, 'true');
  }
  setOnboarded(dbOnboarded);
}

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  useEffect(() => {
    // Initialize session and onboarded flag from storage
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await loadOnboarded(data.session.user.id, setOnboarded);
      } else {
        setOnboarded(false);
      }
      setInitialized(true);
    }).catch(() => {
      setOnboarded(false);
      setInitialized(true);
    });

    // Keep Zustand in sync; load onboarded flag on new sign-in
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await loadOnboarded(session.user.id, setOnboarded);
      } else {
        setOnboarded(false);
      }
    });

    // Handle OAuth deep links that Android delivers outside WebBrowser
    // (first-attempt login on Android often bypasses openAuthSessionAsync)
    Linking.getInitialURL().then((url) => { if (url) handleOAuthUrl(url); });
    const linkSub = Linking.addEventListener('url', (e) => handleOAuthUrl(e.url));

    return () => {
      listener.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <NavigationGuard />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F11' } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="goal/[id]" />
          <Stack.Screen name="milestone/[id]" />
        </Stack>
      </QueryClientProvider>
    </View>
  );
}
