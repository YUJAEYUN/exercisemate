'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  generateAndSaveFCMToken,
  setupForegroundMessageListener,
  getNotificationPermissionStatus
} from '@/lib/notifications';

export function FirebaseMessagingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const initializedRef = useRef(false);

  useEffect(() => {
    const initializeFirebaseMessaging = async () => {
      // 이미 초기화되었거나 사용자가 없으면 건너뛰기
      if (!user || initializedRef.current) return;

      try {
        console.log('Initializing Firebase Messaging for user:', user.uid);

        // 알림 권한 상태 확인
        const permissionStatus = await getNotificationPermissionStatus();
        console.log('Notification permission status:', permissionStatus);

        if (permissionStatus === 'granted') {
          // FCM 토큰 생성 및 저장
          const token = await generateAndSaveFCMToken(user.uid);

          if (token) {
            console.log('FCM token initialized:', token);

            // 포그라운드 메시지 리스너 설정
            await setupForegroundMessageListener();
            console.log('Foreground message listener set up');

            // 초기화 완료 표시
            initializedRef.current = true;
          }
        } else if (permissionStatus === 'default') {
          console.log('Notification permission not requested yet');
        } else {
          console.log('Notification permission denied');
        }
      } catch (error) {
        console.error('Error initializing Firebase Messaging:', error);
      }
    };

    initializeFirebaseMessaging();
  }, [user]);

  // 사용자가 로그아웃하면 초기화 상태 리셋
  useEffect(() => {
    if (!user) {
      initializedRef.current = false;
    }
  }, [user]);

  return <>{children}</>;
}
