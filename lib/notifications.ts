import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DayOfWeek, RecurrenceType } from '@/types';

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// expo-notifications weekday: 1=Sun 2=Mon 3=Tue 4=Wed 5=Thu 6=Fri 7=Sat
const DAY_TO_WEEKDAY: Record<DayOfWeek, number> = {
  Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7, Sun: 1,
};

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

function notifId(habitId: string, weekday: number) {
  return `habit_${habitId}_${weekday}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: asked } = await Notifications.requestPermissionsAsync();
  return asked === 'granted';
}

export async function scheduleHabitNotifications(
  habitId: string,
  title: string,
  startTime: string,
  recurrenceType: RecurrenceType,
  scheduledDay: DayOfWeek,
  recurrenceDays: DayOfWeek[] | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const [hour, minute] = startTime.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return;

  let weekdays: number[] = [];
  if (recurrenceType === 'daily') {
    weekdays = ALL_WEEKDAYS;
  } else if (recurrenceType === 'weekly') {
    weekdays = [DAY_TO_WEEKDAY[scheduledDay]];
  } else if (recurrenceType === 'custom' && recurrenceDays?.length) {
    weekdays = recurrenceDays.map((d) => DAY_TO_WEEKDAY[d]);
  }

  // Cancel existing before rescheduling
  await cancelHabitNotifications(habitId);

  for (const weekday of weekdays) {
    await Notifications.scheduleNotificationAsync({
      identifier: notifId(habitId, weekday),
      content: {
        title: '🔁 Habit reminder',
        body: title,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
  }
}

export async function cancelHabitNotifications(habitId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `habit_${habitId}_`;
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
