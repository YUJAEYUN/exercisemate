'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  clientNotificationManager,
  updateClientNotificationSchedule,
  handleExerciseLogged,
  initializeClientNotifications
} from '@/lib/clientNotifications';
import { getNotificationPermissionStatus } from '@/lib/notifications';

interface NotificationSettings {
  enabled: boolean;
  reminderTime: string;
  reminderDays: number[];
  goalReminder: boolean;
  penaltyWarning: boolean;
}

/**
 * 클라이언트 사이드 알림 관리 훅 (완전 무료)
 */
export function useClientNotifications() {
  const { user } = useAuth();

  // 페이지 로드 시 알림 초기화
  useEffect(() => {
    if (!user?.notificationSettings) return;

    const hasPermission = getNotificationPermissionStatus() === 'granted';
    
    if (hasPermission && user.notificationSettings.enabled) {
      initializeClientNotifications(user.uid, user.notificationSettings);
    }
  }, [user]);

  // 알림 설정 변경 시 스케줄 업데이트
  const updateNotificationSchedule = (settings: NotificationSettings) => {
    const hasPermission = getNotificationPermissionStatus() === 'granted';
    
    if (hasPermission) {
      updateClientNotificationSchedule(settings);
    }
  };

  // 운동 기록 시 알림 처리 (서버 푸시 알림 사용)
  const handleExerciseComplete = async (exerciseCount: number, goal: number) => {
    const hasPermission = getNotificationPermissionStatus() === 'granted';

    if (hasPermission && user?.notificationSettings?.enabled && user?.uid) {
      await handleExerciseLogged(user.uid, exerciseCount, goal);
    }
  };

  // 테스트 알림
  const showTestNotification = () => {
    const hasPermission = getNotificationPermissionStatus() === 'granted';
    
    if (hasPermission) {
      clientNotificationManager.scheduleNotification({
        id: 'test-notification',
        title: '🧪 테스트 알림',
        body: '클라이언트 알림이 정상 작동합니다! 💪',
        scheduledTime: Date.now() + 1000, // 1초 후
        type: 'reminder'
      });
    }
  };

  // 스누즈 알림
  const scheduleSnoozeReminder = () => {
    clientNotificationManager.scheduleSnoozeReminder();
  };

  return {
    updateNotificationSchedule,
    handleExerciseComplete,
    showTestNotification,
    scheduleSnoozeReminder
  };
}
