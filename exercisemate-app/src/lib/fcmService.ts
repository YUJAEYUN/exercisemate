import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { getUser } from './firestore';

// Firebase Functions 호출 인터페이스
interface SendNotificationData {
  targetToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

/**
 * Firebase Functions를 통해 FCM 알림 전송
 */
export async function sendNotificationViaFunction(
  targetToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<SendNotificationResult> {
  try {
    console.log('🚀 Sending notification via Firebase Functions:', {
      targetToken: targetToken.substring(0, 20) + '...',
      title,
      body,
      data
    });

    // Firebase Functions 호출
    const sendNotification = httpsCallable<SendNotificationData, SendNotificationResult>(
      functions,
      'sendNotification'
    );

    const result = await sendNotification({
      targetToken,
      title,
      body,
      data: data || {}
    });

    console.log('✅ Firebase Functions response:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Firebase Functions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 사용자 ID로 FCM 알림 전송
 */
export async function sendNotificationToUser(
  targetUserId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<SendNotificationResult> {
  try {
    console.log('📤 Sending notification to user:', targetUserId);

    // 대상 사용자 정보 조회
    const targetUser = await getUser(targetUserId);
    
    if (!targetUser) {
      return {
        success: false,
        error: 'Target user not found'
      };
    }

    if (!targetUser.fcmToken) {
      return {
        success: false,
        error: 'Target user has no FCM token'
      };
    }

    // Firebase Functions를 통해 알림 전송
    return await sendNotificationViaFunction(
      targetUser.fcmToken,
      title,
      body,
      data
    );
  } catch (error) {
    console.error('❌ Error sending notification to user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 여러 사용자에게 FCM 알림 전송 (Firebase Functions 사용)
 */
export async function sendNotificationToUsers(
  targetUserIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{
  success: boolean;
  results: Array<{ userId: string; success: boolean; error?: string }>;
  successCount: number;
  failureCount: number;
}> {
  try {
    console.log('📤 Sending notifications to multiple users via Firebase Functions:', targetUserIds);

    // 각 사용자에게 개별적으로 알림 전송
    const results = await Promise.all(
      targetUserIds.map(async (userId) => {
        const result = await sendNotificationToUser(userId, title, body, data);
        return {
          userId,
          success: result.success,
          error: result.error
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📊 Notification results: ${successCount} success, ${failureCount} failed`);

    return {
      success: successCount > 0,
      results,
      successCount,
      failureCount
    };
  } catch (error) {
    console.error('❌ Error sending notifications to multiple users:', error);
    return {
      success: false,
      results: targetUserIds.map(userId => ({
        userId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })),
      successCount: 0,
      failureCount: targetUserIds.length
    };
  }
}

/**
 * 테스트 알림 전송
 */
export async function sendTestNotification(
  targetUserId: string
): Promise<SendNotificationResult> {
  return await sendNotificationToUser(
    targetUserId,
    '🧪 테스트 알림',
    'Firebase Functions를 통한 푸시 알림 테스트입니다! 💪',
    {
      type: 'test',
      url: '/dashboard'
    }
  );
}

/**
 * 친구들에게 운동 완료 알림 전송 (Firebase Functions)
 */
export async function notifyFriendsExercise(
  userId: string,
  groupId: string,
  exerciseType: string,
  userName: string
): Promise<SendNotificationResult> {
  try {
    console.log('🏃‍♂️ Notifying friends about exercise via Firebase Functions:', {
      userId,
      groupId,
      exerciseType,
      userName
    });

    const notifyFriends = httpsCallable(functions, 'notifyFriends');

    const result = await notifyFriends({
      userId,
      groupId,
      exerciseType,
      userName
    });

    console.log('✅ Friends notification response:', result.data);
    return result.data as SendNotificationResult;
  } catch (error) {
    console.error('❌ Friends notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 개인 리마인더 알림 전송 (Firebase Functions)
 */
export async function sendPersonalReminder(
  userId: string,
  title: string,
  body: string,
  type: string = 'personal_reminder'
): Promise<SendNotificationResult> {
  try {
    console.log('⏰ Sending personal reminder via Firebase Functions:', {
      userId,
      title,
      body,
      type
    });

    const sendPersonalReminder = httpsCallable(functions, 'sendPersonalReminder');

    const result = await sendPersonalReminder({
      userId,
      title,
      body,
      type
    });

    console.log('✅ Personal reminder response:', result.data);
    return result.data as SendNotificationResult;
  } catch (error) {
    console.error('❌ Personal reminder error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 그룹 목표 달성 알림 전송 (Firebase Functions)
 */
export async function notifyGroupGoalAchievement(
  userId: string,
  groupId: string,
  exerciseCount: number,
  goal: number,
  userName: string
): Promise<SendNotificationResult> {
  try {
    console.log('🎉 Notifying group about goal achievement via Firebase Functions:', {
      userId,
      groupId,
      exerciseCount,
      goal,
      userName
    });

    const notifyGroupGoal = httpsCallable(functions, 'notifyGroupGoal');

    const result = await notifyGroupGoal({
      userId,
      groupId,
      exerciseCount,
      goal,
      userName
    });

    console.log('✅ Group goal notification response:', result.data);
    return result.data as SendNotificationResult;
  } catch (error) {
    console.error('❌ Group goal notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
