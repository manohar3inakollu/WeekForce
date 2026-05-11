import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const onboarded = useAuthStore((s) => s.onboarded);

  // Wait for session restore and onboarded flag to load from AsyncStorage
  if (!initialized || onboarded === null) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#5B5EF4" size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
