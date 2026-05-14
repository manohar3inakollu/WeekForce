import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { View, ActivityIndicator } from 'react-native';
import { XPToast } from '@/components/ui/XPToast';
import { RankUpModal } from '@/components/ui/RankUpModal';
import { TaskCompleteToast } from '@/components/ui/TaskCompleteToast';
import { GoalCompleteOverlay } from '@/components/ui/GoalCompleteOverlay';
import { MilestoneCompleteOverlay } from '@/components/ui/MilestoneCompleteOverlay';

export default function TabsLayout() {
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

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#13131eF8',
          borderTopColor: '#252535',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: '#5B5EF4',
        tabBarInactiveTintColor: '#44445A',
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="repeat-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="rank" options={{ href: null }} />
    </Tabs>
    <XPToast />
    <RankUpModal />
    <TaskCompleteToast />
    <GoalCompleteOverlay />
    <MilestoneCompleteOverlay />
    </View>
  );
}
