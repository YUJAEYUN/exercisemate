'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Trophy,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import type { Group, ExerciseRecord, WeeklyStats, ExerciseType } from '@/types';
import { getCurrentWeekCycle, getExerciseTypeLabel, getDaysUntilPenalty } from '@/lib/utils';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [todayExercise, setTodayExercise] = useState<ExerciseRecord | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exerciseLoading, setExerciseLoading] = useState(false);

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
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (!user.character) {
      router.push('/character-select');
      return;
    }

    if (!user.groupId) {
      router.push('/group');
      return;
    }

    loadDashboardData();
  }, [user, router, loadDashboardData]);

  const handleExerciseLog = async (exerciseType: ExerciseType) => {
    if (!user?.groupId) return;

    try {
      setExerciseLoading(true);
      await logExercise(user.uid, user.groupId, { exerciseType });
      toast.success(`${getExerciseTypeLabel(exerciseType)} 운동이 기록되었습니다!`);
      
      // 데이터 새로고침
      await loadDashboardData();
    } catch (error: unknown) {
      console.error('Exercise logging error:', error);
      const errorMessage = error instanceof Error ? error.message : '운동 기록에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setExerciseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 오늘 운동 상태 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-center">
            {todayExercise ? (
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  오늘 운동 완료! 🎉
                </h2>
                <p className="text-gray-600">
                  {getExerciseTypeLabel(todayExercise.exerciseType)} 운동을 하셨네요!
                </p>
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
                    className="py-3"
                  >
                    상체
                  </Button>
                  <Button
                    onClick={() => handleExerciseLog('lower')}
                    disabled={exerciseLoading}
                    variant="outline"
                    size="sm"
                    className="py-3"
                  >
                    하체
                  </Button>
                  <Button
                    onClick={() => handleExerciseLog('cardio')}
                    disabled={exerciseLoading}
                    variant="outline"
                    size="sm"
                    className="py-3"
                  >
                    유산소
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
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
              />
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
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{group.members.length}/2명</span>
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
            
            {group.members.length < 2 && (
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
    </div>
  );
}
