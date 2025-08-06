'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { 
  User, 
  LogOut, 
  Bell, 
  Shield, 
  HelpCircle,
  ChevronRight,
  Settings as SettingsIcon
} from 'lucide-react';
import Image from 'next/image';
import { PWAStatus } from '@/components/PWANotificationBanner';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) {
    router.push('/');
    return null;
  }

  const settingsItems = [
    {
      icon: User,
      label: '프로필 설정',
      description: '캐릭터 변경 (고양이 ↔ 강아지)',
      onClick: () => router.push('/character-select'),
    },
    {
      icon: Bell,
      label: '알림 설정',
      description: '운동 리마인더 및 푸시 알림',
      onClick: () => router.push('/notifications'),
    },
    {
      icon: Shield,
      label: '개인정보 보호',
      description: '데이터 및 개인정보 관리',
      onClick: () => {
        // TODO: 개인정보 설정 페이지 구현
      },
    },
    {
      icon: HelpCircle,
      label: '도움말',
      description: '사용법 및 자주 묻는 질문',
      onClick: () => {
        // 기능 가이드 다시 보기
        localStorage.removeItem('feature-guide-completed');
        router.push('/dashboard');
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">설정</h1>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 사용자 정보 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              {user.character && (
                <Image
                  src={user.character === 'cat' ? '/exercise_cat.png' : '/exercise_dog.png'}
                  alt={user.character === 'cat' ? '운동하는 고양이' : '운동하는 강아지'}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">{user.displayName}</h2>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-xs text-blue-600 mt-1">
                {user.character === 'cat' ? '🐱 고양이' : '🐶 강아지'} 캐릭터
              </p>
            </div>
          </div>
        </div>

        {/* 설정 메뉴 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full px-6 py-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* 로그아웃 버튼 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Button
            onClick={handleSignOut}
            variant="danger"
            className="w-full flex items-center justify-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span>로그아웃</span>
          </Button>
        </div>

        {/* PWA 상태 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">앱 상태</h3>
          <PWAStatus />
        </div>

        {/* 앱 정보 */}
        <div className="text-center text-sm text-gray-500">
          <p>오운완 챌린지 v1.0.0</p>
          <p className="mt-1">친구와 함께하는 운동 습관 형성</p>
        </div>
      </div>
    </div>
  );
}
