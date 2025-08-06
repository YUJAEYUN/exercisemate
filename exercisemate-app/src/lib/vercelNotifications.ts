/**
 * Firebase Functions를 통한 친구 알림
 */

import { useState, useEffect } from 'react';

interface GroupProgress {
  groupId: string;
  weekStart: string;
  memberProgress: Array<{
    userId: string;
    exerciseCount: number;
    goal: number;
    progress: number;
  }>;
  groupStats: {
    totalGoalsAchieved: number;
    lastGoalAchiever?: string;
    lastGoalAchievedAt?: string;
  };
}

interface GroupActivity {
  type: string;
  user: string;
  timestamp: string;
  message: string;
}

/**
 * 친구들에게 운동 완료 알림 전송
 */
export async function notifyFriendsExercise(
  userId: string,
  groupId: string,
  exerciseType: string,
  userName: string
): Promise<boolean> {
  try {
    // Firebase Functions 사용
    const { notifyFriendsExercise: notifyFriendsViaFunctions } = await import('./fcmService');

    const result = await notifyFriendsViaFunctions(userId, groupId, exerciseType, userName);

    if (result.success) {
      console.log('Friends notified successfully via Firebase Functions:', result);
      return true;
    } else {
      console.error('Failed to notify friends via Firebase Functions:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error notifying friends:', error);
    return false;
  }
}

/**
 * 그룹 목표 달성 알림 전송
 */
export async function notifyGroupGoalAchievement(
  userId: string,
  groupId: string,
  exerciseCount: number,
  goal: number,
  userName: string
): Promise<boolean> {
  try {
    // Firebase Functions 사용
    const { notifyGroupGoalAchievement: notifyGroupGoalViaFunctions } = await import('./fcmService');

    const result = await notifyGroupGoalViaFunctions(userId, groupId, exerciseCount, goal, userName);

    if (result.success) {
      console.log('Group goal achievement notified successfully via Firebase Functions:', result);
      return true;
    } else {
      console.error('Failed to notify group goal achievement via Firebase Functions:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error notifying group goal:', error);
    return false;
  }
}

/**
 * 그룹 진행률 조회
 */
export async function getGroupProgress(groupId: string): Promise<GroupProgress | null> {
  try {
    const response = await fetch(`/api/notify-group-goal?groupId=${groupId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to get group progress:', error);
      return null;
    }

    return await response.json();

  } catch (error) {
    console.error('Error getting group progress:', error);
    return null;
  }
}

/**
 * 운동 기록 시 자동 알림 처리
 */
export async function handleExerciseWithNotifications(
  userId: string,
  groupId: string,
  exerciseType: string,
  userName: string,
  currentExerciseCount: number,
  goal: number
): Promise<void> {
  try {
    // 1. 친구들에게 운동 완료 알림
    const friendNotified = await notifyFriendsExercise(
      userId,
      groupId,
      exerciseType,
      userName
    );

    if (friendNotified) {
      console.log('✅ Friends notified about exercise');
    }

    // 2. 목표 달성 확인 및 알림
    const newExerciseCount = currentExerciseCount + 1;

    if (newExerciseCount >= goal) {
      const goalNotified = await notifyGroupGoalAchievement(
        userId,
        groupId,
        newExerciseCount,
        goal,
        userName
      );

      if (goalNotified) {
        console.log('🎉 Group notified about goal achievement');
      }
    }

  } catch (error) {
    console.error('Error handling exercise notifications:', error);
  }
}

/**
 * 실시간 그룹 활동 피드 (WebSocket 대안)
 */
export class GroupActivityFeed {
  private groupId: string;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastUpdate: string = '';

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  /**
   * 그룹 활동 폴링 시작
   */
  startPolling(callback: (activities: GroupActivity[]) => void, intervalMs: number = 30000) {
    this.pollInterval = setInterval(async () => {
      try {
        const progress = await getGroupProgress(this.groupId);

        if (progress && progress.groupStats.lastGoalAchievedAt !== this.lastUpdate) {
          this.lastUpdate = progress.groupStats.lastGoalAchievedAt || '';

          // 새로운 활동이 있으면 콜백 호출
          callback([{
            type: 'goal_achievement',
            user: progress.groupStats.lastGoalAchiever || 'Unknown',
            timestamp: progress.groupStats.lastGoalAchievedAt || '',
            message: `${progress.groupStats.lastGoalAchiever || 'Someone'}님이 목표를 달성했어요! 🎉`
          }]);
        }
      } catch (error) {
        console.error('Error polling group activities:', error);
      }
    }, intervalMs);
  }

  /**
   * 폴링 중지
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

/**
 * 그룹 활동 훅
 */
export function useGroupActivityFeed(groupId: string) {
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [feed] = useState(() => new GroupActivityFeed(groupId));

  useEffect(() => {
    feed.startPolling((newActivities) => {
      setActivities(prev => [...newActivities, ...prev].slice(0, 10)); // 최근 10개만
    });

    return () => feed.stopPolling();
  }, [feed]);

  return activities;
}