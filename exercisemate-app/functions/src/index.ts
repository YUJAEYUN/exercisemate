/**
 * Firebase Functions for ExerciseMate
 * FCM 푸시 알림 전송 기능
 */

import {onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
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

// 개인 리마인더 알림 인터페이스
interface PersonalReminderData {
  userId: string;
  title: string;
  body: string;
  type: string;
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

// 개인 리마인더 알림 Function
export const sendPersonalReminder = onCall(async (request) => {
  try {
    const {userId, title, body, type} = request.data as PersonalReminderData;

    // 입력 검증
    if (!userId || !title || !body) {
      throw new Error("userId, title, body는 필수 입력값입니다.");
    }

    // Firestore에서 사용자 정보 조회
    const userDoc = await admin.firestore().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const userData = userDoc.data();
    if (!userData?.fcmToken) {
      throw new Error("사용자의 FCM 토큰이 없습니다.");
    }

    // FCM 메시지 구성
    const message = {
      token: userData.fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        type: type || "personal_reminder",
        userId: userId,
        url: "/dashboard",
      },
      webpush: {
        fcmOptions: {
          link: "/dashboard",
        },
      },
    };

    // FCM 전송
    const response = await admin.messaging().send(message);

    logger.info("개인 리마인더 알림 전송 성공", {
      messageId: response,
      userId,
      title,
      body,
    });

    return {
      success: true,
      messageId: response,
      message: "개인 리마인더 알림이 성공적으로 전송되었습니다.",
    };
  } catch (error) {
    logger.error("개인 리마인더 알림 전송 실패", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
});

// 매일 저녁 8시에 운동 리마인더 전송 (한국 시간 기준)
export const dailyExerciseReminder = onSchedule({
  schedule: "0 20 * * *", // 매일 20:00 (UTC)
  timeZone: "Asia/Seoul",
}, async (_event) => {
  try {
    logger.info("Daily exercise reminder started");

    // 알림 설정이 활성화된 모든 사용자 조회
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("notificationSettings.enabled", "==", true)
      .get();

    if (usersSnapshot.empty) {
      logger.info("No users with notifications enabled");
      return;
    }

    const reminderPromises: Promise<any>[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // FCM 토큰이 있는 사용자만 처리
      if (userData.fcmToken) {
        const reminderTime = userData.notificationSettings?.reminderTime || "20:00";
        const currentHour = new Date().getHours();
        const reminderHour = parseInt(reminderTime.split(":")[0]);

        // 설정된 시간과 현재 시간이 일치하는 경우에만 알림 전송
        if (currentHour === reminderHour) {
          const message = {
            token: userData.fcmToken,
            notification: {
              title: "🏃‍♂️ 운동할 시간이에요!",
              body: "오늘도 목표를 향해 달려봐요! 💪",
            },
            data: {
              type: "daily_reminder",
              userId: userId,
              url: "/dashboard",
            },
            webpush: {
              fcmOptions: {
                link: "/dashboard",
              },
            },
          };

          reminderPromises.push(
            admin.messaging().send(message)
              .then((response) => {
                logger.info(`Daily reminder sent to user ${userId}`, {messageId: response});
                return {userId, success: true, messageId: response};
              })
              .catch((error) => {
                logger.error(`Failed to send daily reminder to user ${userId}`, error);
                return {userId, success: false, error: error.message};
              })
          );
        }
      }
    });

    const results = await Promise.all(reminderPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info("Daily exercise reminder completed", {
      totalUsers: usersSnapshot.size,
      remindersSent: results.length,
      successCount,
      failureCount,
    });

    // 로그만 남기고 반환값 없음
    logger.info("Daily reminder process completed", {
      success: true,
      totalUsers: usersSnapshot.size,
      remindersSent: results.length,
      successCount,
      failureCount,
    });
  } catch (error) {
    logger.error("Daily exercise reminder failed", error);
    throw error;
  }
});

// 매주 일요일 저녁 9시에 주간 목표 리마인더 전송
export const weeklyGoalReminder = onSchedule({
  schedule: "0 21 * * 0", // 매주 일요일 21:00 (UTC)
  timeZone: "Asia/Seoul",
}, async (_event) => {
  try {
    logger.info("Weekly goal reminder started");

    // 그룹에 속한 모든 사용자 조회
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("groupId", "!=", null)
      .where("notificationSettings.enabled", "==", true)
      .get();

    if (usersSnapshot.empty) {
      logger.info("No users in groups with notifications enabled");
      return;
    }

    const reminderPromises: Promise<any>[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (userData.fcmToken) {
        const message = {
          token: userData.fcmToken,
          notification: {
            title: "📅 새로운 주가 시작됐어요!",
            body: "이번 주도 운동 목표를 달성해봐요! 화이팅! 🔥",
          },
          data: {
            type: "weekly_goal_reminder",
            userId: userId,
            url: "/dashboard",
          },
          webpush: {
            fcmOptions: {
              link: "/dashboard",
            },
          },
        };

        reminderPromises.push(
          admin.messaging().send(message)
            .then((response) => {
              logger.info(`Weekly goal reminder sent to user ${userId}`, {messageId: response});
              return {userId, success: true, messageId: response};
            })
            .catch((error) => {
              logger.error(`Failed to send weekly goal reminder to user ${userId}`, error);
              return {userId, success: false, error: error.message};
            })
        );
      }
    });

    const results = await Promise.all(reminderPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info("Weekly goal reminder completed", {
      totalUsers: usersSnapshot.size,
      remindersSent: results.length,
      successCount,
      failureCount,
    });

    // 로그만 남기고 반환값 없음
    logger.info("Weekly reminder process completed", {
      success: true,
      totalUsers: usersSnapshot.size,
      remindersSent: results.length,
      successCount,
      failureCount,
    });
  } catch (error) {
    logger.error("Weekly goal reminder failed", error);
    throw error;
  }
});

// 수동으로 모든 사용자에게 테스트 알림 전송 (테스트용)
export const sendTestReminderToAll = onCall(async (_request) => {
  try {
    logger.info("Manual test reminder started");

    // 알림 설정이 활성화된 모든 사용자 조회
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("notificationSettings.enabled", "==", true)
      .get();

    if (usersSnapshot.empty) {
      return {
        success: false,
        error: "알림 설정이 활성화된 사용자가 없습니다.",
      };
    }

    const reminderPromises: Promise<any>[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (userData.fcmToken) {
        const message = {
          token: userData.fcmToken,
          notification: {
            title: "🧪 테스트 알림",
            body: "푸시 알림이 정상적으로 작동하고 있어요! 💪",
          },
          data: {
            type: "test_reminder",
            userId: userId,
            url: "/dashboard",
          },
          webpush: {
            fcmOptions: {
              link: "/dashboard",
            },
          },
        };

        reminderPromises.push(
          admin.messaging().send(message)
            .then((response) => {
              logger.info(`Test reminder sent to user ${userId}`, {messageId: response});
              return {userId, success: true, messageId: response};
            })
            .catch((error) => {
              logger.error(`Failed to send test reminder to user ${userId}`, error);
              return {userId, success: false, error: error.message};
            })
        );
      }
    });

    const results = await Promise.all(reminderPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info("Manual test reminder completed", {
      totalUsers: usersSnapshot.size,
      remindersSent: results.length,
      successCount,
      failureCount,
    });

    return {
      success: true,
      message: `${successCount}명에게 테스트 알림을 전송했습니다.`,
      totalUsers: usersSnapshot.size,
      remindersSent: results.length,
      successCount,
      failureCount,
    };
  } catch (error) {
    logger.error("Manual test reminder failed", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
});
