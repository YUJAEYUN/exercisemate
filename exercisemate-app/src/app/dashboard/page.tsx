'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboardRedirect } from '@/hooks/useAuthRedirect';
import { useRouter } from 'next/navigation';
import { 
  getGroup, 
  getTodayExercise, 
  logExercise, 
  getWeeklyStats,
  subscribeToGroup 
} from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import {
  Dumbbell,
  Calendar,
  Users,
  Settings,
  FileText,
  MessageCircle
} from 'lucide-react';
import Image from 'next/image';
import type { Group, ExerciseRecord, WeeklyStats, ExerciseType } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { getCurrentWeekCycle, getExerciseTypeLabel, getDaysUntilPenalty } from '@/lib/utils';
import { ExerciseCelebration } from '@/components/ExerciseCelebration';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { PWANotificationBanner } from '@/components/PWANotificationBanner';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { useClientNotifications } from '@/hooks/useClientNotifications';
import { handleExerciseWithNotifications } from '@/lib/vercelNotifications';

export default function DashboardPage() {
  const { user, loading: authLoading } = useDashboardRedirect();

  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [todayExercise, setTodayExercise] = useState<ExerciseRecord | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationExerciseType, setCelebrationExerciseType] = useState<ExerciseType>('upper');
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // 진행률 애니메이션 효과
  useEffect(() => {
    const weeklyProgress = weeklyStats ? (weeklyStats.exerciseCount / weeklyStats.goal) * 100 : 0;

    if (weeklyProgress !== animatedProgress) {
      const timer = setTimeout(() => {
        setAnimatedProgress(weeklyProgress);
      }, 300); // 데이터 로드 후 약간의 딜레이

      return () => clearTimeout(timer);
    }
  }, [weeklyStats, animatedProgress]);

  // PWA 알림 훅 사용 (배너 표시용)
  usePWANotifications();

  // 클라이언트 알림 훅 사용 (무료)
  const { handleExerciseComplete } = useClientNotifications();

  const loadDashboardData = useCallback(async () => {
    if (!user?.groupId) return;

    try {
      setLoading(true);
      
      // 그룹 정보 로드
      const groupData = await getGroup(user.groupId);
      setGroup(groupData);

      // 오늘 운동 기록 확인
      const todayRecord = await getTodayExercise(user.uid);
      setTodayExercise(todayRecord);

      // 주간 통계 로드
      const weekCycle = getCurrentWeekCycle();
      const stats = await getWeeklyStats(user.uid, weekCycle.weekString);
      setWeeklyStats(stats);

      // 그룹 실시간 구독
      if (groupData) {
        subscribeToGroup(groupData.id, (updatedGroup) => {
          setGroup(updatedGroup);
        });
      }
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      // Firebase 권한 에러인 경우 더 구체적인 처리
      if (error instanceof Error && error.message.includes('permission')) {
        console.warn('Firebase 권한 문제 - 대시보드 데이터 접근 실패');
        toast.error('데이터 접근 권한이 없습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user?.character && user?.groupId) {
      loadDashboardData();
    }
  }, [user, authLoading, loadDashboardData]);

  const handleExerciseLog = async (exerciseType: ExerciseType) => {
    if (!user?.groupId) return;

    try {
      setExerciseLoading(true);

      // 즉시 UI 업데이트 (낙관적 업데이트)
      const optimisticRecord: ExerciseRecord = {
        id: 'temp-' + Date.now(),
        userId: user.uid,
        groupId: user.groupId,
        date: new Date().toISOString().split('T')[0],
        exerciseType,
        createdAt: Timestamp.now()
      };
      setTodayExercise(optimisticRecord);

      // 실제 데이터베이스에 저장
      await logExercise(user.uid, user.groupId, { exerciseType });

      // 축하 애니메이션 표시
      setCelebrationExerciseType(exerciseType);
      setShowCelebration(true);

      // 클라이언트 알림 처리 (목표 달성 등)
      if (weeklyStats) {
        handleExerciseComplete(weeklyStats.exerciseCount + 1, weeklyStats.goal);
      }

      // Vercel API를 통한 친구 알림 (무료!)
      if (user.displayName && user.groupId) {
        handleExerciseWithNotifications(
          user.uid,
          user.groupId,
          exerciseType,
          user.displayName,
          weeklyStats?.exerciseCount || 0,
          weeklyStats?.goal || 3
        );
      }

      // 백그라운드에서 데이터 새로고침 (정확한 데이터 동기화)
      // 약간의 딜레이를 두어 데이터베이스 업데이트가 완료되도록 함
      setTimeout(() => {
        loadDashboardData();
      }, 1000);
    } catch (error: unknown) {
      console.error('Exercise logging error:', error);
      // 에러 발생 시 낙관적 업데이트 롤백
      setTodayExercise(null);

      // Firebase 인덱스 에러 처리
      if (error instanceof Error && error.message.includes('index')) {
        toast.error('데이터베이스 인덱스를 생성하는 중입니다. 잠시 후 다시 시도해주세요.');
      } else {
        const errorMessage = error instanceof Error ? error.message : '운동 기록에 실패했습니다.';
        toast.error(errorMessage);
      }
    } finally {
      setExerciseLoading(false);
    }
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);

    // 새로고침 대신 데이터만 다시 로드
    loadDashboardData();
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">그룹 정보를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/group')}>
            그룹 설정으로 이동
          </Button>
        </div>
      </div>
    );
  }

  const weeklyProgress = weeklyStats ? (weeklyStats.exerciseCount / weeklyStats.goal) * 100 : 0;
  const daysUntilPenalty = getDaysUntilPenalty();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              <Image
                src={user?.character === 'cat' ? '/exercise_cat.png' : '/exercise_dog.png'}
                alt={user?.character === 'cat' ? '운동하는 고양이' : '운동하는 강아지'}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{group.name}</h1>
              <p className="text-sm text-gray-600">주 {group.weeklyGoal}회 목표</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* PWA 알림 배너 */}
        <PWANotificationBanner />

        {/* 오늘 운동 상태 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-center">
            {todayExercise ? (
              <div className="relative">
                {/* 배경 장식 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="text-8xl">🎉</div>
                </div>

                <div className="relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Image
                      src={user?.character === 'cat' ? '/exercise_cat.png' : '/exercise_dog.png'}
                      alt={user?.character === 'cat' ? '운동하는 고양이' : '운동하는 강아지'}
                      width={60}
                      height={60}
                      className="object-cover"
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    오늘 운동 완료! 🎉
                  </h2>
                  <p className="text-gray-600 mb-2">
                    {getExerciseTypeLabel(todayExercise.exerciseType)} 운동을 하셨네요!
                  </p>
                  <div className="bg-green-50 rounded-lg p-3 mt-3">
                    <p className="text-green-800 font-medium text-sm">
                      {user?.character === 'cat' ? '🐱 냥냥! 오늘도 대단해요!' : '🐶 멍멍! 오늘도 최고예요!'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  오운완 도장 찍기
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleExerciseLog('upper')}
                    disabled={exerciseLoading}
                    variant="outline"
                    size="sm"
                    className="py-4 flex flex-col items-center space-y-1 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:scale-105"
                  >
                    <span className="text-2xl">💪</span>
                    <span className="text-sm font-medium">상체</span>
                  </Button>
                  <Button
                    onClick={() => handleExerciseLog('lower')}
                    disabled={exerciseLoading}
                    variant="outline"
                    size="sm"
                    className="py-4 flex flex-col items-center space-y-1 hover:bg-green-50 hover:border-green-300 transition-all duration-200 hover:scale-105"
                  >
                    <span className="text-2xl">🦵</span>
                    <span className="text-sm font-medium">하체</span>
                  </Button>
                  <Button
                    onClick={() => handleExerciseLog('cardio')}
                    disabled={exerciseLoading}
                    variant="outline"
                    size="sm"
                    className="py-4 flex flex-col items-center space-y-1 hover:bg-red-50 hover:border-red-300 transition-all duration-200 hover:scale-105"
                  >
                    <span className="text-2xl">❤️</span>
                    <span className="text-sm font-medium">유산소</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 주간 진행률 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">이번 주 진행률</h3>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{daysUntilPenalty}일 남음</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {weeklyStats?.exerciseCount || 0} / {group.weeklyGoal}회
              </span>
              <span className="font-medium text-gray-900">
                {Math.round(weeklyProgress)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden relative">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${Math.min(animatedProgress, 100)}%` }}
              >
                {/* 진행률이 0보다 클 때만 반짝이는 효과 */}
                {animatedProgress > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                )}

                {/* 100% 달성 시 특별한 효과 */}
                {animatedProgress >= 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-green-500 animate-pulse" />
                )}
              </div>

              {/* 배경에 미묘한 그라데이션 효과 */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-300 opacity-50" />
            </div>
            
            {weeklyProgress >= 100 ? (
              <p className="text-sm text-green-600 font-medium">
                🎉 이번 주 목표 달성!
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                목표까지 {group.weeklyGoal - (weeklyStats?.exerciseCount || 0)}회 남았어요
              </p>
            )}
          </div>
        </div>

        {/* 벌칙 시스템 */}
        {weeklyProgress < 100 && daysUntilPenalty <= 1 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-red-900">⚠️ 벌칙 경고</h3>
              <div className="text-sm text-red-600">
                {daysUntilPenalty === 0 ? '오늘 마감!' : '내일 마감!'}
              </div>
            </div>

            <p className="text-sm text-red-700 mb-4">
              이번 주 목표를 달성하지 못하면 반성문을 작성해야 해요! 😱
            </p>

            <div className="flex space-x-3">
              <Button
                onClick={() => router.push('/penalty')}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                반성문 미리보기
              </Button>
            </div>
          </div>
        )}

        {/* 그룹 멤버 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">그룹 멤버</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/send-message')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>메시지</span>
              </button>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{group.members.length}/{group.maxMembers || 2}명</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {group.members.map((memberId, index) => (
              <div key={memberId} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {memberId === user?.uid ? '나' : '친구'}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {/* 여기에 친구의 진행률 표시 가능 */}
                </div>
              </div>
            ))}
            
            {group.members.length < (group.maxMembers || 2) && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  친구를 초대해보세요!
                </p>
                <p className="text-xs text-gray-400">
                  초대 코드: <span className="font-mono font-bold">{group.inviteCode}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 운동 축하 애니메이션 */}
      <ExerciseCelebration
        isVisible={showCelebration}
        exerciseType={celebrationExerciseType}
        character={user?.character || 'cat'}
        onComplete={handleCelebrationComplete}
      />
    </div>
  );
}
