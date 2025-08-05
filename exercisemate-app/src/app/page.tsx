'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Dumbbell, Users, Trophy } from 'lucide-react';

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // 사용자가 로그인되어 있으면 적절한 페이지로 리다이렉트
      if (!user.character) {
        router.push('/character-select');
      } else if (!user.groupId) {
        router.push('/group');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            오운완 챌린지
          </h1>
          <p className="text-gray-600">
            친구와 함께하는 운동 습관 형성 챌린지
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-gray-700">친구와 함께 운동 목표 설정</span>
          </div>

          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="text-gray-700">매일 운동 인증하기</span>
          </div>

          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Trophy className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-gray-700">목표 미달성 시 재미있는 벌칙</span>
          </div>
        </div>

        <Button
          onClick={signInWithGoogle}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
          disabled={loading}
        >
          {loading ? '로그인 중...' : '구글로 시작하기'}
        </Button>

        <p className="text-xs text-gray-500 mt-4">
          계속 진행하면 서비스 이용약관에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
