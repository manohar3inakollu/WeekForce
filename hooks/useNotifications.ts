import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'wf_notification_prefs';
const CHANNEL_ID = 'weekforce-default';

export interface NotificationPrefs {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // 'HH:MM'
  taskReminders: boolean;
}

const DEFAULTS: NotificationPrefs = {
  enabled: false,
  dailyReminder: true,
  dailyReminderTime: '08:00',
  taskReminders: true,
};

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'WeekForce',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5B5EF4',
    sound: 'default',
  });
}

async function scheduleDailyReminder(time: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'WeekForce',
      body: 'Time to check your goals and tasks for today!',
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) setPrefs(JSON.parse(stored));
      } catch {}
      try {
        await ensureAndroidChannel();
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const save = async (next: NotificationPrefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      await ensureAndroidChannel();
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      return status === 'granted';
    } catch {
      return false;
    }
  };

  const toggleEnabled = async () => {
    const next = !prefs.enabled;
    if (next) {
      const granted = await requestPermission();
      if (!granted) return;
      if (prefs.dailyReminder) await scheduleDailyReminder(prefs.dailyReminderTime);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await save({ ...prefs, enabled: next });
  };

  const toggleDailyReminder = async () => {
    const next = !prefs.dailyReminder;
    await save({ ...prefs, dailyReminder: next });
    if (prefs.enabled) {
      if (next) await scheduleDailyReminder(prefs.dailyReminderTime);
      else await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const setDailyReminderTime = async (time: string) => {
    await save({ ...prefs, dailyReminderTime: time });
    if (prefs.enabled && prefs.dailyReminder) await scheduleDailyReminder(time);
  };

  const toggleTaskReminders = async () => {
    await save({ ...prefs, taskReminders: !prefs.taskReminders });
  };

  return { prefs, permissionStatus, loading, toggleEnabled, toggleDailyReminder, setDailyReminderTime, toggleTaskReminders };
}
