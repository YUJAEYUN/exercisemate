import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Firebase Admin SDK 초기화
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Firebase Admin credentials are not properly configured');
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
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

    const response = await adminMessaging.send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
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
