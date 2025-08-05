import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

// Firebase Admin 초기화
initializeApp();

const db = getFirestore();
const messaging = getMessaging();

interface NotificationSettings {
  enabled: boolean;
  reminderTime: string;
  reminderDays: number[];
  goalReminder: boolean;
  penaltyWarning: boolean;
}

interface User {
  uid: string;
  fcmToken?: string;
  notificationSettings?: NotificationSettings;
  groupId?: string;
}

/**
 * 매일 오후 8시에 실행되는 운동 리마인더 알림
 */
export const sendDailyReminders = onSchedule('0 20 * * *', async (event) => {
  console.log('Starting daily reminder notifications...');
  
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM" 형식
    
    // 알림 설정이 활성화된 사용자들 조회
    const usersSnapshot = await db.collection('users')
      .where('notificationSettings.enabled', '==', true)
      .get();
    
    const notifications: Promise<any>[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data() as User;
      const settings = user.notificationSettings;
      
      if (!settings || !user.fcmToken) continue;
      
      // 오늘이 알림 요일인지 확인
      if (!settings.reminderDays.includes(currentDay)) continue;
      
      // 알림 시간 확인 (±30분 범위)
      const [settingHour, settingMinute] = settings.reminderTime.split(':').map(Number);
      const settingTimeMinutes = settingHour * 60 + settingMinute;
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      // 30분 범위 내에서만 알림 전송
      if (Math.abs(currentTimeMinutes - settingTimeMinutes) > 30) continue;
      
      // 오늘 이미 운동했는지 확인
      const today = now.toISOString().split('T')[0];
      const todayExerciseSnapshot = await db.collection('exerciseRecords')
        .where('userId', '==', user.uid)
        .where('date', '==', today)
        .limit(1)
        .get();
      
      if (!todayExerciseSnapshot.empty) {
        console.log(`User ${user.uid} already exercised today, skipping reminder`);
        continue;
      }
      
      // 알림 전송
      const message = {
        token: user.fcmToken,
        notification: {
          title: '🏃‍♂️ 오운완 챌린지',
          body: '운동할 시간이에요! 오늘도 목표를 향해 달려봐요! 💪',
        },
        data: {
          type: 'daily_reminder',
          url: '/dashboard',
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#2563eb',
            channelId: 'exercise_reminders',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };
      
      notifications.push(
        messaging.send(message).catch((error) => {
          console.error(`Failed to send reminder to user ${user.uid}:`, error);
          
          // FCM 토큰이 유효하지 않은 경우 제거
          if (error.code === 'messaging/registration-token-not-registered') {
            return db.collection('users').doc(user.uid).update({
              fcmToken: null,
            });
          }
        })
      );
    }
    
    await Promise.all(notifications);
    console.log(`Sent ${notifications.length} daily reminder notifications`);
  } catch (error) {
    console.error('Error sending daily reminders:', error);
  }
});

/**
 * 주간 목표 달성 시 축하 알림
 */
export const sendGoalAchievementNotification = onDocumentUpdated(
  'weeklyStats/{statsId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (!before || !after) return;
    
    // 목표 달성 여부 확인
    const wasCompleted = before.exerciseCount >= before.goal;
    const isCompleted = after.exerciseCount >= after.goal;
    
    if (wasCompleted || !isCompleted) return; // 이미 완료되었거나 아직 미완료
    
    try {
      // 사용자 정보 조회
      const userDoc = await db.collection('users').doc(after.userId).get();
      const user = userDoc.data() as User;
      
      if (!user?.fcmToken || !user.notificationSettings?.goalReminder) return;
      
      const message = {
        token: user.fcmToken,
        notification: {
          title: '🎉 목표 달성!',
          body: `이번 주 운동 목표를 달성했어요! ${after.exerciseCount}/${after.goal}회 완료! 🏆`,
        },
        data: {
          type: 'goal_achievement',
          url: '/dashboard',
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#16a34a',
            channelId: 'achievements',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };
      
      await messaging.send(message);
      console.log(`Sent goal achievement notification to user ${after.userId}`);
    } catch (error) {
      console.error('Error sending goal achievement notification:', error);
    }
  }
);

/**
 * 매일 오후 6시에 벌칙 경고 알림 확인
 */
export const sendPenaltyWarnings = onSchedule('0 18 * * 0', async (event) => {
  console.log('Checking for penalty warnings...');
  
  try {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    
    // 이번 주 통계 조회
    const statsSnapshot = await db.collection('weeklyStats')
      .where('weekStart', '==', currentWeekStart)
      .get();
    
    const notifications: Promise<any>[] = [];
    
    for (const statsDoc of statsSnapshot.docs) {
      const stats = statsDoc.data();
      
      // 목표 미달성자만 대상
      if (stats.exerciseCount >= stats.goal) continue;
      
      // 사용자 정보 조회
      const userDoc = await db.collection('users').doc(stats.userId).get();
      const user = userDoc.data() as User;
      
      if (!user?.fcmToken || !user.notificationSettings?.penaltyWarning) continue;
      
      const remaining = stats.goal - stats.exerciseCount;
      
      const message = {
        token: user.fcmToken,
        notification: {
          title: '⚠️ 벌칙 경고!',
          body: `이번 주 마감까지 ${remaining}회 더 운동해야 해요! 반성문을 피하세요! 😱`,
        },
        data: {
          type: 'penalty_warning',
          url: '/dashboard',
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#dc2626',
            channelId: 'warnings',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };
      
      notifications.push(
        messaging.send(message).catch((error) => {
          console.error(`Failed to send penalty warning to user ${stats.userId}:`, error);
        })
      );
    }
    
    await Promise.all(notifications);
    console.log(`Sent ${notifications.length} penalty warning notifications`);
  } catch (error) {
    console.error('Error sending penalty warnings:', error);
  }
});

/**
 * 주의 시작일 계산 (월요일 기준)
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
