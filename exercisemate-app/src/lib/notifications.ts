import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { updateUser, getUser } from './firestore';
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
    console.log('🔧 Starting FCM token generation for user:', userId);
    console.log('🔧 VAPID Key available:', !!VAPID_KEY);
    console.log('🔧 VAPID Key length:', VAPID_KEY?.length || 0);

    const messagingInstance = await messaging();
    if (!messagingInstance) {
      console.error('❌ Firebase Messaging is not supported');
      return null;
    }
    console.log('✅ Firebase Messaging instance created');

    if (!VAPID_KEY) {
      console.error('❌ VAPID key is not configured');
      return null;
    }
    console.log('✅ VAPID key is configured');

    // 알림 권한 확인
    console.log('🔧 Requesting notification permission...');
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.error('❌ Notification permission denied');
      return null;
    }
    console.log('✅ Notification permission granted');

    // FCM 토큰 생성
    console.log('🔧 Generating FCM token...');
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log('✅ FCM Token generated successfully!');
      console.log('🔧 Token length:', token.length);
      console.log('🔧 Token preview:', token.substring(0, 50) + '...');

      // 현재 사용자 데이터 확인하여 토큰이 다른 경우에만 업데이트
      try {
        const currentUser = await getUser(userId);
        if (currentUser?.fcmToken !== token) {
          console.log('FCM token changed, updating user data');
          // Firestore에 토큰 저장
          await updateUser(userId, {
            fcmToken: token,
            notificationSettings: DEFAULT_NOTIFICATION_SETTINGS
          });
        } else {
          console.log('FCM token unchanged, skipping update');
        }
      } catch (error) {
        console.error('Error checking current user data:', error);
        // 에러 발생 시에도 토큰 업데이트 시도
        await updateUser(userId, {
          fcmToken: token,
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS
        });
      }

      return token;
    } else {
      console.error('❌ No registration token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating FCM token:', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
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
export async function showTestNotification() {
  try {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      alert('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.');
      return;
    }

    // 간단한 브라우저 알림만 사용 (actions 없이)
    try {
      const notification = new Notification('🏃‍♂️ 오운완 챌린지', {
        body: '테스트 알림입니다! 💪',
        icon: '/icons/icon-192x192.png',
        tag: 'test-notification'
      });

      // 알림 클릭 시 앱으로 포커스
      notification.onclick = function() {
        window.focus();
        notification.close();
      };

      console.log('Test notification sent successfully');

      // 3초 후 자동으로 닫기
      setTimeout(() => {
        notification.close();
      }, 3000);

    } catch (notificationError) {
      console.error('Browser notification failed:', notificationError);
      const errorMessage = notificationError instanceof Error ? notificationError.message : String(notificationError);
      alert('알림 전송에 실패했습니다: ' + errorMessage);
    }

  } catch (error) {
    console.error('Error sending test notification:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert('알림 테스트 중 오류가 발생했습니다: ' + errorMessage);
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

/**
 * Firebase Functions를 통한 서버 푸시 알림 전송 테스트
 */
export async function testServerNotification(userId: string, _idToken?: string) {
  try {
    // Firebase Functions를 사용하여 알림 전송
    const { sendTestNotification } = await import('@/lib/fcmService');

    const result = await sendTestNotification(userId);

    if (result.success) {
      console.log('Firebase Functions notification sent successfully:', result);
      return { success: true, result };
    } else {
      console.error('Firebase Functions notification failed:', result);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending server notification:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
