import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { updateUser } from './firestore';
import { toast } from 'react-hot-toast';

// VAPID 키 (Firebase 콘솔에서 생성해야 함)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // "09:00" 형식
  reminderDays: number[]; // 0=일요일, 1=월요일, ..., 6=토요일
  goalReminder: boolean;
  penaltyWarning: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTime: '20:00',
  reminderDays: [1, 2, 3, 4, 5], // 월-금
  goalReminder: true,
  penaltyWarning: true,
};

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * FCM 토큰 생성 및 저장
 */
export async function generateAndSaveFCMToken(userId: string): Promise<string | null> {
  try {
    const messagingInstance = await messaging();
    if (!messagingInstance) {
      console.log('Firebase Messaging is not supported');
      return null;
    }

    if (!VAPID_KEY) {
      console.error('VAPID key is not configured');
      return null;
    }

    // 알림 권한 확인
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return null;
    }

    // FCM 토큰 생성
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log('FCM Token generated:', token);
      
      // Firestore에 토큰 저장
      await updateUser(userId, { 
        fcmToken: token,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS
      });
      
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error generating FCM token:', error);
    return null;
  }
}

/**
 * 포그라운드 메시지 리스너 설정
 */
export async function setupForegroundMessageListener() {
  try {
    const messagingInstance = await messaging();
    if (!messagingInstance) return;

    onMessage(messagingInstance, (payload) => {
      console.log('Foreground message received:', payload);
      
      const { title, body } = payload.notification || {};
      
      if (title && body) {
        // 포그라운드에서는 toast로 표시
        toast.success(`${title}: ${body}`, {
          duration: 5000,
          icon: '🔔',
        });
      }
    });
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
  }
}

/**
 * 알림 설정 업데이트
 */
export async function updateNotificationSettings(
  userId: string, 
  settings: NotificationSettings
): Promise<void> {
  try {
    await updateUser(userId, { notificationSettings: settings });
    console.log('Notification settings updated:', settings);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

/**
 * 테스트 알림 전송 (개발용)
 */
export function showTestNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('오운완 챌린지', {
      body: '테스트 알림입니다! 💪',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
    });
  }
}

/**
 * 알림 권한 상태 확인
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * 브라우저가 알림을 지원하는지 확인
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}
