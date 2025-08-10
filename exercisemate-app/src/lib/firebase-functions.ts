import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

// Firebase Functions 인스턴스
const functions = getFunctions(app);

// 테스트 알림 전송 함수
export const sendTestNotification = async (userId: string) => {
  try {
    const testNotificationFunction = httpsCallable(functions, 'sendTestNotification');
    const result = await testNotificationFunction({ userId });
    return result.data as { success: boolean; successCount: number; failureCount: number };
  } catch (error) {
    console.error('Error calling sendTestNotification:', error);
    throw error;
  }
};

// 친구에게 알림 전송 함수 (기존)
export const notifyFriends = async (userId: string, userName: string, exerciseType: string) => {
  try {
    const notifyFriendsFunction = httpsCallable(functions, 'notifyFriends');
    const result = await notifyFriendsFunction({ userId, userName, exerciseType });
    return result.data;
  } catch (error) {
    console.error('Error calling notifyFriends:', error);
    throw error;
  }
};

// 그룹 목표 달성 알림 함수 (기존)
export const notifyGroupGoal = async (groupId: string, achieverName: string) => {
  try {
    const notifyGroupGoalFunction = httpsCallable(functions, 'notifyGroupGoal');
    const result = await notifyGroupGoalFunction({ groupId, achieverName });
    return result.data;
  } catch (error) {
    console.error('Error calling notifyGroupGoal:', error);
    throw error;
  }
};
