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
