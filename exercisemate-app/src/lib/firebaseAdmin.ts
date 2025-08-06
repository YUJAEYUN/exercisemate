import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';

// Firebase Admin SDK 초기화
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    try {
      // 로컬 개발환경에서는 새로운 JSON 파일 사용
      if (process.env.NODE_ENV === 'development') {
        const serviceAccountPath = path.join(process.cwd(), 'exercisemate-firebase-adminsdk-fbsvc-df64703270.json');

        console.log('Initializing Firebase Admin with new service account file:', serviceAccountPath);

        initializeApp({
          credential: cert(serviceAccountPath),
          projectId: 'exercisemate'
        });

        console.log('Firebase Admin initialized successfully with new JSON file');
      }
      // 프로덕션 환경에서는 하드코딩된 서비스 계정 사용
      else {
        console.log('Initializing Firebase Admin with hardcoded service account');

        initializeApp({
          credential: cert({
            projectId: "exercisemate",
            clientEmail: "firebase-adminsdk-fbsvc@exercisemate.iam.gserviceaccount.com",
            privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCe4WGR7m9mGdME\n9hTj12ijVP2vh6oPZ2fJHniJfHBFZ+mgXvG/98dIyz6uJ+v6qzRxGSlaRIZCZzke\ngj9DNZh/JjUw1G2HbHHwUu1xLlnbVGTMQ9z4Wy74hEQupODWmQsDmOJy8eENGM1w\nHSsYMI1ltm8q37ACsrYNHlC9Q91WY9x8Dx8SCh5WfrXP26qtrlDb4p5xuZIJ6mS3\nMA9rSW3o7H0WmJuiwTzmsjXOecQk7cYOtH+UB+3gfusMEabJaCFG0q6kY6zDzYeH\naY7vdCuu5GMchLcVl2j90dqbrVH3PH9gJPcsnx6E8RI5QhtSa9+Dg6QyCO4tDYfH\nVJqpHZRzAgMBAAECggEAEc5usf1IDOheBxNRWgu9VXjkCbUpsRpEvnykw7vnlU/F\nFk0tyPcLJbRprPkacHiZowdP5CcD6RNKionMb0rlcXKlyXg1YlUcG/QfWmz4cyVt\nOptse4U0qXOhdJzT+hki699JmdpT/7TE6YjLWKWwYzLkGKkDP/opfyTjpaKiftj7\nDfZfl07k+DDsEkt3icGo9RQFfhCCr9NuE7Yxo85JPA5weW+m8urWTpXmP6ze7rs9\n/tpeKjCykRLZnOo7nZ78BHsRL2MBqnL84Ik+uPwgbahKhXtuMzjwtwGLaG8aH9NE\n2pU90Nif0XYnxJyaI9xSwTlAHFAtGgY7BO0KDAowmQKBgQDTlWbFpTivAUoZwxUK\nDUFYzEAHLpzIzJ2D4RCkCvAzcqE5ZverSFWwhgF6pM/+wY7sTtKarHriCJEMO+k/\nFqDmg/HnabBKwBdacrUHZ0VugI0SCoeoVpGfrhqGVRbQaqybGOn6AAJHXq0WJxHB\n+pz6Vbdt8W0s25hhjCIePDKJ9wKBgQDAO6+Ch1MmhUW/l9K6PH5NHPMv/OHbdMiB\n7M2SIjUDlywfIQDOzdzic5Lm9Cid+4kRX2UVKEdqyvL4TKAkyNHWb63wPHi47HED\n3Zjqk/fmWcdLkkBn6fUX+lm7lSpEGsk8tQQdjNzyrkzdRL+kFoLbpRESMa5aP72J\n8SqBaCKKZQKBgBoa9uEv73x4NkJTdYcV95gTK1s3fxSvWkfpPvpedyCB5i6E683w\nUNJE1m3hY+BU1WOGnimDWm4FDJBr2+1yx0tpwDEDM0MlzDvWp0tQjJqDteQh9Hbq\np3ECNDeazAPPBZjlTAkSczWHEugGzgQW/cNNTCJ+hS/hsD1o4tTELKAlAoGAap8w\nQ9fHOPBmtVQCX6W58A+EmzNKGqz1oYq0or8yZGFu6X0ms43fXAL6kfsOpEGlzur4\nZ/nFUuhqR2pI0N5J9QRQl5US6I7MSHaaoFGeCDf3oGToMDrF5JzJNJARt2CcCX3l\nYHaG/lvK6ld9bAfIYQd3Jn5D1G7SNDZ9evVFYzkCgYEAweaZv2umK/maXVD0Qg/O\nmNpBS+/tXp/Y5LyaADoCFmkvc1yndzB7NdwjioDrsiRD41I6bkSOsW6YKvNINICq\nztuG8eWAiHzb0dlGAhK6nPbTPLG31aDe3Fp8UfQxTa/Hj3N77Wipphr9Sb1IV3WC\nunT/IAkerZ0k0EBvqHJ/bM0=\n-----END PRIVATE KEY-----\n"
          }),
          projectId: 'exercisemate'
        });

        console.log('Firebase Admin initialized successfully with hardcoded service account');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }

  return getApps()[0];
};

// Firebase Admin 서비스들
export const adminApp = initializeFirebaseAdmin();
export const adminDb = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);

/**
 * FCM V1 API를 사용하여 푸시 알림 전송
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    console.log('Attempting to send FCM notification:', {
      token: token.substring(0, 20) + '...',
      title,
      body,
      data
    });

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: data?.url || '/dashboard',
        },
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: true,
          tag: data?.type || 'exercise-notification',
        },
      },
    };

    console.log('FCM message payload:', JSON.stringify(message, null, 2));

    const response = await adminMessaging.send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as { code?: string })?.code || 'No code',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    throw error;
  }
}

/**
 * 여러 토큰에 동시에 알림 전송
 */
export async function sendMulticastNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: data?.url || '/dashboard',
        },
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: true,
          tag: data?.type || 'exercise-notification',
        },
      },
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages`);
    
    if (response.failureCount > 0) {
      console.log(`Failed to send ${response.failureCount} messages`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
        }
      });
    }
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending multicast message:', error);
    throw error;
  }
}

/**
 * 사용자 FCM 토큰 조회
 */
export async function getUserFCMToken(userId: string): Promise<string | null> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return null;
    }
    
    const userData = userDoc.data();
    return userData?.fcmToken || null;
  } catch (error) {
    console.error('Error getting user FCM token:', error);
    return null;
  }
}

/**
 * 그룹 멤버들의 FCM 토큰 조회 (요청자 제외)
 */
export async function getGroupMemberTokens(groupId: string, excludeUserId?: string): Promise<string[]> {
  try {
    const groupDoc = await adminDb.collection('groups').doc(groupId).get();
    
    if (!groupDoc.exists) {
      console.log(`Group ${groupId} not found`);
      return [];
    }
    
    const groupData = groupDoc.data();
    const members = groupData?.members || [];
    
    // 요청자 제외
    const targetMembers = excludeUserId 
      ? members.filter((memberId: string) => memberId !== excludeUserId)
      : members;
    
    if (targetMembers.length === 0) {
      return [];
    }
    
    // 멤버들의 FCM 토큰 조회
    const tokens: string[] = [];
    
    for (const memberId of targetMembers) {
      const token = await getUserFCMToken(memberId);
      if (token) {
        tokens.push(token);
      }
    }
    
    return tokens;
  } catch (error) {
    console.error('Error getting group member tokens:', error);
    return [];
  }
}
