import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#5B5EF4" size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <Redirect href="/(tabs)" />;
}
