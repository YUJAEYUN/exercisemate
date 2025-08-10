import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { FCMTokenInfo } from '@/types';

/**
 * 기기 고유 ID 생성 (브라우저 기반)
 */
function generateDeviceId(): string {
  // 기존 기기 ID가 있으면 사용
  let deviceId = localStorage.getItem('device-id');
  
  if (!deviceId) {
    // 브라우저 정보 기반으로 고유 ID 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL();
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // 해시 생성
    const combined = `${fingerprint}-${userAgent}-${screen}-${timezone}-${Date.now()}`;
    deviceId = btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    
    localStorage.setItem('device-id', deviceId);
  }
  
  return deviceId;
}

/**
 * 기기 타입 감지
 */
function getDeviceType(): 'web' | 'android' | 'ios' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('android')) {
    return 'android';
  } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  } else {
    return 'web';
  }
}

/**
 * 사용자의 FCM 토큰 목록 조회
 */
export async function getUserFCMTokens(userId: string): Promise<FCMTokenInfo[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    return userData.fcmTokens || [];
  } catch (error) {
    console.error('Error getting user FCM tokens:', error);
    return [];
  }
}

/**
 * 새로운 FCM 토큰 추가 (기기별)
 */
export async function addFCMToken(
  userId: string, 
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const deviceId = generateDeviceId();
    const deviceType = getDeviceType();
    const userAgent = navigator.userAgent;
    
    console.log('🔧 Adding FCM token for device:', { deviceId, deviceType, userAgent });
    
    // 기존 토큰들 조회
    const existingTokens = await getUserFCMTokens(userId);
    
    // 같은 기기의 기존 토큰 제거
    const tokensToRemove = existingTokens.filter(t => t.deviceId === deviceId);
    
    // 새로운 토큰 정보 생성
    const newTokenInfo: FCMTokenInfo = {
      token,
      deviceId,
      deviceType,
      userAgent,
      lastUsed: Timestamp.now(),
      createdAt: Timestamp.now()
    };
    
    const userDocRef = doc(db, 'users', userId);
    
    // 기존 토큰 제거 후 새 토큰 추가
    if (tokensToRemove.length > 0) {
      await updateDoc(userDocRef, {
        fcmTokens: arrayRemove(...tokensToRemove)
      });
    }
    
    await updateDoc(userDocRef, {
      fcmTokens: arrayUnion(newTokenInfo),
      fcmToken: token, // 하위 호환성을 위해 유지
      updatedAt: Timestamp.now()
    });
    
    console.log('✅ FCM token added successfully:', newTokenInfo);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding FCM token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 만료된 FCM 토큰 정리 (30일 이상 사용하지 않은 토큰)
 */
export async function cleanupExpiredTokens(userId: string): Promise<void> {
  try {
    const existingTokens = await getUserFCMTokens(userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expiredTokens = existingTokens.filter(token => {
      const lastUsed = token.lastUsed.toDate();
      return lastUsed < thirtyDaysAgo;
    });
    
    if (expiredTokens.length > 0) {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        fcmTokens: arrayRemove(...expiredTokens)
      });
      
      console.log(`🧹 Cleaned up ${expiredTokens.length} expired FCM tokens`);
    }
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}

/**
 * FCM 토큰 사용 시간 업데이트
 */
export async function updateTokenLastUsed(userId: string, token: string): Promise<void> {
  try {
    const existingTokens = await getUserFCMTokens(userId);
    const tokenToUpdate = existingTokens.find(t => t.token === token);
    
    if (tokenToUpdate) {
      const updatedToken = {
        ...tokenToUpdate,
        lastUsed: Timestamp.now()
      };
      
      const userDocRef = doc(db, 'users', userId);
      
      // 기존 토큰 제거 후 업데이트된 토큰 추가
      await updateDoc(userDocRef, {
        fcmTokens: arrayRemove(tokenToUpdate)
      });
      
      await updateDoc(userDocRef, {
        fcmTokens: arrayUnion(updatedToken)
      });
    }
  } catch (error) {
    console.error('Error updating token last used:', error);
  }
}

/**
 * 모든 활성 FCM 토큰 조회 (알림 전송용)
 */
export async function getActiveFCMTokens(userId: string): Promise<string[]> {
  try {
    const tokenInfos = await getUserFCMTokens(userId);
    
    // 최근 30일 내에 사용된 토큰만 반환
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeTokens = tokenInfos
      .filter(tokenInfo => {
        const lastUsed = tokenInfo.lastUsed.toDate();
        return lastUsed >= thirtyDaysAgo;
      })
      .map(tokenInfo => tokenInfo.token);
    
    console.log(`📱 Found ${activeTokens.length} active FCM tokens for user ${userId}`);
    
    return activeTokens;
  } catch (error) {
    console.error('Error getting active FCM tokens:', error);
    return [];
  }
}

/**
 * 기기 정보 조회
 */
export function getCurrentDeviceInfo() {
  return {
    deviceId: generateDeviceId(),
    deviceType: getDeviceType(),
    userAgent: navigator.userAgent
  };
}
