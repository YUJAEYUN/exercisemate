import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, getGroupMemberTokens, sendMulticastNotification } from '@/lib/firebaseAdmin';

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
    const userId = decodedToken.uid;

    // 요청 본문 파싱
    const body = await request.json();
    const { groupId, exerciseType, userName } = body;

    if (!groupId || !exerciseType || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: groupId, exerciseType, userName' },
        { status: 400 }
      );
    }

    // 그룹 멤버들의 FCM 토큰 조회 (요청자 제외)
    const memberTokens = await getGroupMemberTokens(groupId, userId);

    if (memberTokens.length === 0) {
      return NextResponse.json({
        message: 'No group members to notify',
        notificationsSent: 0,
      });
    }

    // 운동 타입에 따른 이모지 매핑
    const exerciseEmojis: Record<string, string> = {
      '상체': '💪',
      '하체': '🦵',
      '유산소': '🏃‍♂️',
      '전신': '🏋️‍♂️',
      '기타': '💪',
    };

    const emoji = exerciseEmojis[exerciseType] || '💪';

    // 알림 메시지 구성
    const title = '🎉 친구가 운동했어요!';
    const body = `${userName}님이 ${exerciseType} 운동을 완료했어요! ${emoji}`;

    // 알림 데이터
    const notificationData = {
      type: 'friend_exercise',
      userId: userId,
      groupId: groupId,
      exerciseType: exerciseType,
      userName: userName,
      url: '/dashboard',
    };

    // 푸시 알림 전송
    const result = await sendMulticastNotification(
      memberTokens,
      title,
      body,
      notificationData
    );

    console.log(`Sent exercise notification to ${result.successCount} group members`);

    return NextResponse.json({
      message: 'Friend exercise notifications sent successfully',
      notificationsSent: result.successCount,
      notificationsFailed: result.failureCount,
    });

  } catch (error) {
    console.error('Error in notify-friends API:', error);
    
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
