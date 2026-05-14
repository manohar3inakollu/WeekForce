import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
            queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
          },
        });
        if (error) throw error;
      } else {
        const redirectTo = Linking.createURL('/');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
          },
        });
        if (error) throw error;
        if (!data.url) return;

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const url = result.url;
          if (url.includes('access_token=')) {
            const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
            const params = new URLSearchParams(fragment ?? '');
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token') ?? '';
            if (!access_token) throw new Error('No access token in OAuth redirect');
            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionError) throw sessionError;
          } else {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url);
            if (sessionError) throw sessionError;
          }
          // onAuthStateChange fires async, so manually sync the session into Zustand
          // before navigating so index.tsx sees it immediately on render.
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setSession(session);
          router.replace('/');
        }
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', 'Something went wrong. Please try again.');
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Hero gradient top */}
      <LinearGradient
        colors={['#1a1a2e', '#0F0F11']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
      >
        {/* Logo / branding */}
        <View style={{ alignItems: 'center', marginBottom: 56, gap: 12 }}>
          <Image
            source={require('@/assets/splash-icon.png')}
            style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 4 }}
            resizeMode="cover"
          />
          <Text style={{ color: '#F0F0F5', fontSize: 36, fontWeight: '800', letterSpacing: -0.5 }}>
            Stride
          </Text>
          <Text style={{ color: '#8888A0', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Build habits. Earn XP. Climb ranks.{'\n'}Sign in to continue.
          </Text>
        </View>

        {/* Rank preview pills */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          {([['Beginner', '#6B7280'], ['Expert', '#3B82F6'], ['Legend', '#F59E0B'], ['Immortal', '#8B5CF6']] as const).map(([rank, color]) => (
            <View
              key={rank}
              style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                backgroundColor: color + '18', borderWidth: 1, borderColor: color + '44',
              }}
            >
              <Text style={{ color, fontSize: 9, fontWeight: '700' }}>{rank}</Text>
            </View>
          ))}
        </View>

        {/* OAuth buttons */}
        <View style={{ width: '100%', gap: 12 }}>
          <TouchableOpacity
            onPress={() => handleOAuthSignIn('google')}
            disabled={oauthLoading !== null}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
              backgroundColor: '#222228', borderWidth: 1, borderColor: '#2A2A32',
              borderRadius: 14, paddingVertical: 15, opacity: oauthLoading !== null ? 0.6 : 1,
            }}
          >
            <FontAwesome name="google" size={20} color="#EA4335" />
            <Text style={{ color: '#F0F0F5', fontWeight: '600', fontSize: 16 }}>
              {oauthLoading === 'google' ? 'Opening…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuthSignIn('apple')}
            disabled={oauthLoading !== null}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
              backgroundColor: '#222228', borderWidth: 1, borderColor: '#2A2A32',
              borderRadius: 14, paddingVertical: 15, opacity: oauthLoading !== null ? 0.6 : 1,
            }}
          >
            <FontAwesome name="apple" size={22} color="#FFFFFF" />
            <Text style={{ color: '#F0F0F5', fontWeight: '600', fontSize: 16 }}>
              {oauthLoading === 'apple' ? 'Opening…' : 'Continue with Apple'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: '#55556A', fontSize: 12, textAlign: 'center', marginTop: 28, lineHeight: 18 }}>
          By continuing you agree to our Terms of Service{'\n'}and Privacy Policy.
        </Text>
      </LinearGradient>
    </View>
  );
}
