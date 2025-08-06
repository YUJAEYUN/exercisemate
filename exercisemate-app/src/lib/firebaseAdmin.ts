import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Firebase Admin SDK 초기화
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    try {
      // 모든 환경에서 하드코딩된 서비스 계정 사용
      {
        console.log('Initializing Firebase Admin with hardcoded service account');

        initializeApp({
          credential: cert({
            projectId: "exercisemate",
            clientEmail: "firebase-adminsdk-fbsvc@exercisemate.iam.gserviceaccount.com",
            privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6XwP2Z+k/IYEm\nOEXthS2EqQn5RFbupIAcZIDadZ/gyfds8Jkiijt5ZBKWHvISV0F6FV+9zbSRTnvt\nZzY+TdUD1cdlmFIqB/A7MrXCsw+FWobuIyTSuHsR8BxEtq/YQTpACeXpW3/sRdrz\nIMW7mkTt/ak26cMTGJfulhz+7ovlMrk9JtgD5azjrlDwJiCjwHGKb6teoOkNBHvh\nqXoXy/wBoS5ZfFMBhQDrbEiAxooUc3bjwNP1VYrr0U3CPBsmNew+OupiGe0DbiAt\nqoggChzcOba1VKsSmT5SSh8xcNYVqjtu9OA1I4mDn+TMsY/RkpjuxxuFChds4SoE\nan+pCq5RAgMBAAECggEABCooZAK5bxw4DxsV0PN3a239l5Dj4mxRopDKYldbjcHl\nog0UVvXA03sdgTZK0YcaovhETfEBVnfrBAiY6TaDCpVl4crQFzlbMG93KVUoBSJb\nPooRghX2RhXYA98TOeFnRFQUS60sRCLhfCpg0MrnPGw9Mklx/wS/LGk1V6sL/ECm\nph+jAWAAkbVMnyfwo/y7IQCr9QeQn1WNDObjE7N4+FYSaZj331spqSfzxZ62bfwI\nU2dn4UXsQdqBjCut+d9u1TNJlZAazXQeF09mm1K6bCzN+160UbnJE4rrPkkld5vd\nanyc5UCyHT8Do1Fy1ZQt4PIDASWPGcznF99aRXldOwKBgQDlAG/9dONWAM87KYx5\n53Wd8sSUY3QPt7/mewJwwGXQAEFDFjhlRK5TqgEKtJ9W11/wqKfEbSiOpeTtp8yR\njYxQGatj1IIuUmdN+mSIxWZ2dsS0HwTeWHYWxwwKdBOOLGhJmtfOFp24om5LZrTZ\nhGqPtjuLteMrLM2fcOREdjsG0wKBgQDQV+8H1KrFwyrkZswHw6gQYiA3HB8wDafO\nC62YZx9vE3WjeemPdjY0PFRxLVi/kky34t5zqcXCMKN/4vu0U6GIdEAHD1n5rXUG\n6o5315C6baIU/5kvJ18PMFhtJ5OwIw8/SuM7OLoxYabpqZ79ndNwPvHUp3XkDyF0\n8J3kWfGHywKBgQC5AmB34X5lFiRWRNwEBLZmVCLzS2IR7L7x4wF2vEnFAN+45nPL\nhPBeEWPkFUcB7uDI2kkoDZSNooNQaZeBJF1uvT5VWfOOnu5s9lVQlkKQhKWoa8MQ\nK2HERy14KI0/+KqMhLfC/UyRRVFcQ27qqOs6jdyPo/QTBpBdNuSEVwybFwKBgGnv\nPDfkF40ExotqBXYxMwRZkH3VC7qYRumKoJLsZFxLLbaYp3xto/P9dQYzA3ws/FtH\nvMpc2ZP6vTeqh0dSesDyMxgj4yED5IxGuXgQIKPaWN6KdC44u6nycBPYWszllrwc\n7NtQ5cN0HrWSrKfSFw9swfPZziTO2LkoG3Bfl2LvAoGAdEEaANQDRx+TulotuzFM\n1CVmNoW9Jz/CzZ6ZqTQAhgXcb5X2L851RRB0azxjdPnnFlNm7Hg/WRgn+9y5TTzb\n6T4Lw1K6Out78DquGyDkCICJWBlL2gCYX32Ie6xR0+qwLIxR9NIu9u0MpqeE3jE4\nMLBMDvPMHc9EkOan6o2E0tk=\n-----END PRIVATE KEY-----\n"
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
