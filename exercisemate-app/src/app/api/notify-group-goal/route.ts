import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, adminDb, getGroupMemberTokens, sendMulticastNotification } from '@/lib/firebaseAdmin';

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
    const requestBody = await request.json();
    const { groupId, exerciseCount, goal, userName } = requestBody;

    if (!groupId || exerciseCount === undefined || !goal || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: groupId, exerciseCount, goal, userName' },
        { status: 400 }
      );
    }

    // 그룹 멤버들의 FCM 토큰 조회 (요청자 포함)
    const memberTokens = await getGroupMemberTokens(groupId);

    if (memberTokens.length === 0) {
      return NextResponse.json({
        message: 'No group members to notify',
        notificationsSent: 0,
      });
    }

    // 알림 메시지 구성
    const title = '🎉 목표 달성!';
    const body = `${userName}님이 이번 주 운동 목표를 달성했어요! ${exerciseCount}/${goal}회 완료! 🏆`;

    // 알림 데이터
    const notificationData = {
      type: 'goal_achievement',
      userId: userId,
      groupId: groupId,
      exerciseCount: exerciseCount.toString(),
      goal: goal.toString(),
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

    // 그룹 통계 업데이트 (목표 달성 기록)
    try {
      await adminDb.collection('groups').doc(groupId).update({
        lastGoalAchiever: userName,
        lastGoalAchievedAt: new Date().toISOString(),
        updatedAt: new Date(),
      });
    } catch (updateError) {
      console.error('Error updating group stats:', updateError);
      // 통계 업데이트 실패해도 알림은 성공으로 처리
    }

    console.log(`Sent goal achievement notification to ${result.successCount} group members`);

    return NextResponse.json({
      message: 'Goal achievement notifications sent successfully',
      notificationsSent: result.successCount,
      notificationsFailed: result.failureCount,
    });

  } catch (error) {
    console.error('Error in notify-group-goal API:', error);
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing groupId parameter' },
        { status: 400 }
      );
    }

    // 그룹 정보 조회
    const groupDoc = await adminDb.collection('groups').doc(groupId).get();
    
    if (!groupDoc.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = groupDoc.data();

    // 그룹 진행률 정보 반환
    const groupProgress = {
      groupStats: {
        lastGoalAchiever: groupData?.lastGoalAchiever || null,
        lastGoalAchievedAt: groupData?.lastGoalAchievedAt || null,
        weeklyGoal: groupData?.weeklyGoal || 3,
        memberCount: groupData?.members?.length || 0,
      },
    };

    return NextResponse.json(groupProgress);

  } catch (error) {
    console.error('Error in notify-group-goal GET API:', error);
    
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
