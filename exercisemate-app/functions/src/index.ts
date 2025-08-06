/**
 * Firebase Functions for ExerciseMate
 * FCM 푸시 알림 전송 기능
 */

import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Firebase Admin 초기화
admin.initializeApp();

// FCM 알림 전송 인터페이스
interface SendNotificationData {
  targetToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// 친구들에게 운동 완료 알림 인터페이스
interface NotifyFriendsData {
  userId: string;
  groupId: string;
  exerciseType: string;
  userName: string;
}

// 그룹 목표 달성 알림 인터페이스
interface NotifyGroupGoalData {
  userId: string;
  groupId: string;
  exerciseCount: number;
  goal: number;
  userName: string;
}

// 사용자에게 알림 전송 인터페이스
interface SendToUserData {
  targetUserId: string;
  title: string;
  body: string;
  type?: string;
  url?: string;
  data?: Record<string, string>;
}

// FCM 알림 전송 Function
export const sendNotification = onCall(async (request) => {
  try {
    const {targetToken, title, body, data} = request.data as SendNotificationData;

    // 입력 검증
    if (!targetToken || !title || !body) {
      throw new Error("targetToken, title, body는 필수 입력값입니다.");
    }

    // FCM 메시지 구성
    const message = {
      token: targetToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: "https://exercisemate.vercel.app", // 알림 클릭 시 이동할 URL
        },
      },
    };

    // FCM 전송
    const response = await admin.messaging().send(message);

    logger.info("FCM 알림 전송 성공", {
      messageId: response,
      targetToken,
      title,
      body,
    });

    return {
      success: true,
      messageId: response,
      message: "알림이 성공적으로 전송되었습니다.",
    };
  } catch (error) {
    logger.error("FCM 알림 전송 실패", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
});

// 사용자에게 알림 전송 Function
export const sendToUser = onCall(async (request) => {
  try {
    const {targetUserId, title, body, type = "custom", url = "/dashboard", data = {}} = request.data as SendToUserData;

    // 입력 검증
    if (!targetUserId || !title || !body) {
      throw new Error("targetUserId, title, body는 필수 입력값입니다.");
    }

    // Firestore에서 대상 사용자 정보 조회
    const userDoc = await admin.firestore().collection("users").doc(targetUserId).get();

    if (!userDoc.exists) {
      throw new Error("대상 사용자를 찾을 수 없습니다.");
    }

    const userData = userDoc.data();
    if (!userData?.fcmToken) {
      throw new Error("대상 사용자의 FCM 토큰이 없습니다.");
    }

    // FCM 메시지 구성
    const notificationData: Record<string, string> = {
      type: String(type),
      url: String(url),
      ...Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      ),
    };

    const message = {
      token: userData.fcmToken,
      notification: {
        title,
        body,
      },
      data: notificationData,
      webpush: {
        fcmOptions: {
          link: url,
        },
      },
    };

    // FCM 전송
    const response = await admin.messaging().send(message);

    logger.info("사용자 알림 전송 성공", {
      messageId: response,
      targetUserId,
      title,
      body,
    });

    return {
      success: true,
      messageId: response,
      message: "알림이 성공적으로 전송되었습니다.",
    };
  } catch (error) {
    logger.error("사용자 알림 전송 실패", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
});

// 친구들에게 운동 완료 알림 Function
export const notifyFriends = onCall(async (request) => {
  try {
    const {userId, groupId, exerciseType, userName} = request.data as NotifyFriendsData;

    // 입력 검증
    if (!userId || !groupId || !exerciseType || !userName) {
      throw new Error("userId, groupId, exerciseType, userName은 필수 입력값입니다.");
    }

    // 그룹 정보 조회
    const groupDoc = await admin.firestore().collection("groups").doc(groupId).get();

    if (!groupDoc.exists) {
      throw new Error("그룹을 찾을 수 없습니다.");
    }

    const groupData = groupDoc.data();
    const members = groupData?.members || [];

    // 본인을 제외한 그룹 멤버들의 FCM 토큰 수집
    const memberTokens: string[] = [];

    for (const memberId of members) {
      if (memberId !== userId) {
        const memberDoc = await admin.firestore().collection("users").doc(memberId).get();
        const memberData = memberDoc.data();

        if (memberData?.fcmToken) {
          memberTokens.push(memberData.fcmToken);
        }
      }
    }

    if (memberTokens.length === 0) {
      return {
        success: true,
        message: "알림을 받을 그룹 멤버가 없습니다.",
        notificationsSent: 0,
      };
    }

    // 알림 메시지 구성
    const title = "🏃‍♂️ 친구가 운동했어요!";
    const body = `${userName}님이 ${exerciseType} 운동을 완료했어요! 💪`;

    // 멀티캐스트 메시지 구성
    const message = {
      tokens: memberTokens,
      notification: {
        title,
        body,
      },
      data: {
        type: "friend_exercise",
        userId: userId,
        groupId: groupId,
        exerciseType: exerciseType,
        userName: userName,
        url: "/dashboard",
      },
      webpush: {
        fcmOptions: {
          link: "/dashboard",
        },
      },
    };

    // FCM 멀티캐스트 전송
    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info("친구 운동 알림 전송 성공", {
      successCount: response.successCount,
      failureCount: response.failureCount,
      userId,
      groupId,
      exerciseType,
    });

    return {
      success: true,
      message: "친구들에게 알림이 전송되었습니다.",
      notificationsSent: response.successCount,
      notificationsFailed: response.failureCount,
    };
  } catch (error) {
    logger.error("친구 운동 알림 전송 실패", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
});

// 그룹 목표 달성 알림 Function
export const notifyGroupGoal = onCall(async (request) => {
  try {
    const {userId, groupId, exerciseCount, goal, userName} = request.data as NotifyGroupGoalData;

    // 입력 검증
    if (!userId || !groupId || exerciseCount === undefined || !goal || !userName) {
      throw new Error("userId, groupId, exerciseCount, goal, userName은 필수 입력값입니다.");
    }

    // 그룹 정보 조회
    const groupDoc = await admin.firestore().collection("groups").doc(groupId).get();

    if (!groupDoc.exists) {
      throw new Error("그룹을 찾을 수 없습니다.");
    }

    const groupData = groupDoc.data();
    const members = groupData?.members || [];

    // 모든 그룹 멤버들의 FCM 토큰 수집 (본인 포함)
    const memberTokens: string[] = [];

    for (const memberId of members) {
      const memberDoc = await admin.firestore().collection("users").doc(memberId).get();
      const memberData = memberDoc.data();

      if (memberData?.fcmToken) {
        memberTokens.push(memberData.fcmToken);
      }
    }

    if (memberTokens.length === 0) {
      return {
        success: true,
        message: "알림을 받을 그룹 멤버가 없습니다.",
        notificationsSent: 0,
      };
    }

    // 알림 메시지 구성
    const title = "🎉 목표 달성!";
    const body = `${userName}님이 이번 주 운동 목표를 달성했어요! ${exerciseCount}/${goal}회 완료! 🏆`;

    // 멀티캐스트 메시지 구성
    const message = {
      tokens: memberTokens,
      notification: {
        title,
        body,
      },
      data: {
        type: "goal_achievement",
        userId: userId,
        groupId: groupId,
        exerciseCount: exerciseCount.toString(),
        goal: goal.toString(),
        userName: userName,
        url: "/dashboard",
      },
      webpush: {
        fcmOptions: {
          link: "/dashboard",
        },
      },
    };

    // FCM 멀티캐스트 전송
    const response = await admin.messaging().sendEachForMulticast(message);

    // 그룹 통계 업데이트
    try {
      await admin.firestore().collection("groups").doc(groupId).update({
        lastGoalAchiever: userName,
        lastGoalAchievedAt: new Date().toISOString(),
        updatedAt: new Date(),
      });
    } catch (updateError) {
      logger.error("그룹 통계 업데이트 실패", updateError);
      // 통계 업데이트 실패해도 알림은 성공으로 처리
    }

    logger.info("그룹 목표 달성 알림 전송 성공", {
      successCount: response.successCount,
      failureCount: response.failureCount,
      userId,
      groupId,
      exerciseCount,
      goal,
    });

    return {
      success: true,
      message: "그룹에 목표 달성 알림이 전송되었습니다.",
      notificationsSent: response.successCount,
      notificationsFailed: response.failureCount,
    };
  } catch (error) {
    logger.error("그룹 목표 달성 알림 전송 실패", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
});
