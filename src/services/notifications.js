import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId, role) {
  if (!Device.isDevice) return null;

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (token && userId) {
    try {
      await apiFetch('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify({ userId, role, token }),
      });
    } catch (e) {
      console.error('Token registration failed:', e.message);
    }
  }

  return token;
}
