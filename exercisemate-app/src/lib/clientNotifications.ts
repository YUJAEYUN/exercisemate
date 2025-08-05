/**
 * 클라이언트 사이드 푸시 알림 (완전 무료)
 * 브라우저의 Notification API와 setTimeout을 활용
 */

import { NotificationSettings } from '@/types';

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: number;
  type: 'reminder' | 'goal' | 'penalty';
  data?: any;
}

class ClientNotificationManager {
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();
  private storageKey = 'scheduled-notifications';

  /**
   * 알림 스케줄링
   */
  scheduleNotification(notification: ScheduledNotification) {
    const now = Date.now();
    const delay = notification.scheduledTime - now;

    if (delay <= 0) {
      // 이미 지난 시간이면 즉시 실행
      this.showNotification(notification);
      return;
    }

    // 기존 알림이 있으면 취소
    this.cancelNotification(notification.id);

    // 새 알림 스케줄링
    const timeoutId = setTimeout(() => {
      this.showNotification(notification);
      this.scheduledNotifications.delete(notification.id);
      this.saveScheduledNotifications();
    }, delay);

    this.scheduledNotifications.set(notification.id, timeoutId);
    this.saveScheduledNotifications();

    console.log(`Notification scheduled: ${notification.title} in ${Math.round(delay / 1000)}s`);
  }

  /**
   * 알림 표시
   */
  private showNotification(notification: ScheduledNotification) {
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    const options: NotificationOptions = {
      body: notification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: notification.type,
      requireInteraction: true,
      data: {
        url: '/dashboard',
        type: notification.type,
        ...notification.data
      }
    };

    // 타입별 커스터마이징
    switch (notification.type) {
      case 'reminder':
        options.actions = [
          { action: 'exercise', title: '운동 기록하기' },
          { action: 'snooze', title: '30분 후 알림' }
        ];
        break;
      case 'goal':
        options.icon = '/icons/trophy-icon.png';
        options.actions = [
          { action: 'share', title: '성과 공유하기' },
          { action: 'view', title: '대시보드 보기' }
        ];
        break;
      case 'penalty':
        options.icon = '/icons/warning-icon.png';
        options.requireInteraction = true;
        options.actions = [
          { action: 'exercise_now', title: '지금 운동하기' },
          { action: 'view_penalty', title: '반성문 보기' }
        ];
        break;
    }

    new Notification(notification.title, options);
  }

  /**
   * 알림 취소
   */
  cancelNotification(id: string) {
    const timeoutId = this.scheduledNotifications.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(id);
      this.saveScheduledNotifications();
    }
  }

  /**
   * 모든 알림 취소
   */
  cancelAllNotifications() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
    localStorage.removeItem(this.storageKey);
  }

  /**
   * 스케줄된 알림 저장 (페이지 새로고침 대응)
   */
  private saveScheduledNotifications() {
    const notifications = Array.from(this.scheduledNotifications.keys());
    localStorage.setItem(this.storageKey, JSON.stringify(notifications));
  }

  /**
   * 페이지 로드 시 스케줄된 알림 복원
   */
  restoreScheduledNotifications() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const notificationIds = JSON.parse(saved);
        // 실제로는 더 복잡한 복원 로직이 필요하지만, 
        // 간단히 하기 위해 다음 알림만 다시 스케줄링
        this.scheduleNextReminder();
      }
    } catch (error) {
      console.error('Failed to restore notifications:', error);
    }
  }

  /**
   * 다음 운동 리마인더 스케줄링
   */
  scheduleNextReminder(settings?: NotificationSettings) {
    if (!settings?.enabled) return;

    const now = new Date();
    const [hour, minute] = settings.reminderTime.split(':').map(Number);
    
    // 오늘 알림 시간 계산
    const today = new Date();
    today.setHours(hour, minute, 0, 0);
    
    // 내일 알림 시간 계산
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 오늘 시간이 지났으면 내일로
    const targetTime = today.getTime() > now.getTime() ? today : tomorrow;
    const targetDay = targetTime.getDay();
    
    // 설정된 요일인지 확인
    if (!settings.reminderDays.includes(targetDay)) {
      // 다음 설정된 요일 찾기
      let nextDay = new Date(targetTime);
      for (let i = 1; i <= 7; i++) {
        nextDay.setDate(nextDay.getDate() + 1);
        if (settings.reminderDays.includes(nextDay.getDay())) {
          targetTime.setTime(nextDay.getTime());
          break;
        }
      }
    }

    this.scheduleNotification({
      id: 'daily-reminder',
      title: '🏃‍♂️ 오운완 챌린지',
      body: '운동할 시간이에요! 오늘도 목표를 향해 달려봐요! 💪',
      scheduledTime: targetTime.getTime(),
      type: 'reminder'
    });
  }

  /**
   * 목표 달성 알림 (즉시)
   */
  showGoalAchievementNotification(exerciseCount: number, goal: number) {
    this.showNotification({
      id: 'goal-achievement',
      title: '🎉 목표 달성!',
      body: `이번 주 운동 목표를 달성했어요! ${exerciseCount}/${goal}회 완료! 🏆`,
      scheduledTime: Date.now(),
      type: 'goal'
    });
  }

  /**
   * 벌칙 경고 알림 스케줄링 (주말에)
   */
  schedulePenaltyWarning(remaining: number) {
    const now = new Date();
    const sunday = new Date(now);
    
    // 이번 주 일요일 오후 6시로 설정
    const daysUntilSunday = (7 - now.getDay()) % 7;
    sunday.setDate(now.getDate() + daysUntilSunday);
    sunday.setHours(18, 0, 0, 0);
    
    // 이미 일요일 6시가 지났으면 다음 주
    if (sunday.getTime() <= now.getTime()) {
      sunday.setDate(sunday.getDate() + 7);
    }

    this.scheduleNotification({
      id: 'penalty-warning',
      title: '⚠️ 벌칙 경고!',
      body: `이번 주 마감까지 ${remaining}회 더 운동해야 해요! 반성문을 피하세요! 😱`,
      scheduledTime: sunday.getTime(),
      type: 'penalty'
    });
  }

  /**
   * 스누즈 알림 (30분 후)
   */
  scheduleSnoozeReminder() {
    const snoozeTime = Date.now() + (30 * 60 * 1000); // 30분 후

    this.scheduleNotification({
      id: 'snooze-reminder',
      title: '🔔 운동 리마인더',
      body: '30분이 지났어요! 이제 운동할 시간입니다! 💪',
      scheduledTime: snoozeTime,
      type: 'reminder'
    });
  }
}

// 싱글톤 인스턴스
export const clientNotificationManager = new ClientNotificationManager();

/**
 * 알림 설정 업데이트 시 호출
 */
export function updateClientNotificationSchedule(settings: NotificationSettings) {
  if (settings.enabled) {
    clientNotificationManager.scheduleNextReminder(settings);
  } else {
    clientNotificationManager.cancelAllNotifications();
  }
}

/**
 * 운동 기록 시 호출
 */
export function handleExerciseLogged(exerciseCount: number, goal: number) {
  // 목표 달성 시 즉시 알림
  if (exerciseCount >= goal) {
    clientNotificationManager.showGoalAchievementNotification(exerciseCount, goal);
  }
  
  // 벌칙 경고 스케줄링 (목표 미달성 시)
  const remaining = goal - exerciseCount;
  if (remaining > 0) {
    clientNotificationManager.schedulePenaltyWarning(remaining);
  }
}

/**
 * 페이지 로드 시 호출
 */
export function initializeClientNotifications(settings?: NotificationSettings) {
  // 기존 스케줄 복원
  clientNotificationManager.restoreScheduledNotifications();
  
  // 새 스케줄 설정
  if (settings?.enabled) {
    clientNotificationManager.scheduleNextReminder(settings);
  }
}

/**
 * 알림 클릭 핸들러 (서비스 워커에서 사용)
 */
export function handleNotificationClick(action: string) {
  switch (action) {
    case 'snooze':
      clientNotificationManager.scheduleSnoozeReminder();
      break;
    case 'exercise':
    case 'exercise_now':
      window.location.href = '/dashboard';
      break;
    case 'share':
      window.location.href = '/dashboard?share=true';
      break;
    case 'view_penalty':
      window.location.href = '/penalty';
      break;
    default:
      window.location.href = '/dashboard';
  }
}
