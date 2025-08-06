import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, sendPushNotification, sendMulticastNotification } from '@/lib/firebaseAdmin';
import { getUser, getGroup } from '@/lib/firestore';

const auth = getAuth(adminApp);

export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Firebase Auth 토큰 검증
    const decodedToken = await auth.verifyIdToken(idToken);
    const senderId = decodedToken.uid;

    // 요청 본문 파싱
    const requestBody = await request.json();
    const { 
      targetUserId, 
      targetUserIds, 
      title, 
      body, 
      type = 'custom',
      url = '/dashboard',
      data = {} 
    } = requestBody;

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 }
      );
    }

    // 단일 사용자에게 알림 전송
    if (targetUserId) {
      try {
        // 발신자의 그룹 정보 확인
        const senderUser = await getUser(senderId);
        if (!senderUser || !senderUser.groupId) {
          return NextResponse.json(
            { error: 'Sender is not in a group' },
            { status: 403 }
          );
        }

        const senderGroup = await getGroup(senderUser.groupId);
        if (!senderGroup) {
          return NextResponse.json(
            { error: 'Sender group not found' },
            { status: 404 }
          );
        }

        // 대상 사용자가 같은 그룹 멤버인지 확인
        if (!senderGroup.members.includes(targetUserId)) {
          return NextResponse.json(
            { error: 'Target user is not in the same group' },
            { status: 403 }
          );
        }

        const targetUser = await getUser(targetUserId);

        if (!targetUser || !targetUser.fcmToken) {
          return NextResponse.json(
            { error: 'Target user not found or no FCM token' },
            { status: 404 }
          );
        }

        // FCM data는 모든 값이 문자열이어야 함
        const notificationData: Record<string, string> = {
          type: String(type),
          senderId: String(senderId),
          url: String(url)
        };

        // 추가 데이터가 있으면 문자열로 변환하여 추가
        if (data) {
          Object.entries(data).forEach(([key, value]) => {
            notificationData[key] = String(value);
          });
        }

        await sendPushNotification(
          targetUser.fcmToken,
          title,
          body,
          notificationData
        );

        console.log(`Sent notification to user ${targetUserId}`);

        return NextResponse.json({
          message: 'Notification sent successfully',
          targetUserId,
          notificationsSent: 1
        });

      } catch (error) {
        console.error('Error sending notification to single user:', error);
        return NextResponse.json(
          { error: 'Failed to send notification to user' },
          { status: 500 }
        );
      }
    }

    // 여러 사용자에게 알림 전송
    if (targetUserIds && Array.isArray(targetUserIds)) {
      try {
        // 발신자의 그룹 정보 확인
        const senderUser = await getUser(senderId);
        if (!senderUser || !senderUser.groupId) {
          return NextResponse.json(
            { error: 'Sender is not in a group' },
            { status: 403 }
          );
        }

        const senderGroup = await getGroup(senderUser.groupId);
        if (!senderGroup) {
          return NextResponse.json(
            { error: 'Sender group not found' },
            { status: 404 }
          );
        }

        console.log('Sender group members:', senderGroup.members);
        console.log('Target user IDs:', targetUserIds);
        console.log('Sender ID:', senderId);

        // 대상 사용자들이 모두 같은 그룹 멤버인지 확인
        for (const userId of targetUserIds) {
          if (!senderGroup.members.includes(userId)) {
            console.log(`User ${userId} is not in the same group`);
            return NextResponse.json(
              { error: `User ${userId} is not in the same group` },
              { status: 403 }
            );
          }
        }

        const tokens: string[] = [];
        const userDetails: any[] = [];

        for (const userId of targetUserIds) {
          try {
            const user = await getUser(userId);
            console.log(`User ${userId}:`, {
              exists: !!user,
              hasFcmToken: !!(user?.fcmToken),
              displayName: user?.displayName
            });

            if (user && user.fcmToken) {
              tokens.push(user.fcmToken);
              userDetails.push({ userId, displayName: user.displayName });
            }
          } catch (error) {
            console.warn(`Failed to get user ${userId}:`, error);
          }
        }

        console.log('Valid tokens found:', tokens.length);
        console.log('Users with tokens:', userDetails);

        if (tokens.length === 0) {
          return NextResponse.json(
            { error: 'No valid FCM tokens found for target users' },
            { status: 404 }
          );
        }

        // FCM data는 모든 값이 문자열이어야 함
        const notificationData: Record<string, string> = {
          type: String(type),
          senderId: String(senderId),
          url: String(url)
        };

        // 추가 데이터가 있으면 문자열로 변환하여 추가
        if (data) {
          Object.entries(data).forEach(([key, value]) => {
            notificationData[key] = String(value);
          });
        }

        const result = await sendMulticastNotification(
          tokens,
          title,
          body,
          notificationData
        );

        console.log(`Sent notifications to ${result.successCount} users`);

        return NextResponse.json({
          message: 'Notifications sent successfully',
          targetUserIds,
          notificationsSent: result.successCount,
          notificationsFailed: result.failureCount
        });

      } catch (error) {
        console.error('Error sending notifications to multiple users:', error);
        return NextResponse.json(
          { error: 'Failed to send notifications to users' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Either targetUserId or targetUserIds must be provided' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in send-notification API:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 알림 전송 기능 테스트용 GET 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testUserId = searchParams.get('testUserId');

    if (!testUserId) {
      return NextResponse.json(
        { error: 'Missing testUserId parameter' },
        { status: 400 }
      );
    }

    // 테스트 알림 전송
    const testUser = await getUser(testUserId);
    
    if (!testUser || !testUser.fcmToken) {
      return NextResponse.json(
        { error: 'Test user not found or no FCM token' },
        { status: 404 }
      );
    }

    await sendPushNotification(
      testUser.fcmToken,
      '🧪 테스트 알림',
      '서버에서 보내는 푸시 알림 테스트입니다! 💪',
      {
        type: 'test',
        url: '/dashboard'
      }
    );

    return NextResponse.json({
      message: 'Test notification sent successfully',
      testUserId
    });

  } catch (error) {
    console.error('Error in send-notification GET API:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
