'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle, Bell, Users, Settings, HelpCircle } from 'lucide-react';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    icon: MessageCircle,
    label: '메시지 전송',
    description: '친구들에게 응원 메시지 보내기',
    href: '/send-message',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100'
  },
  {
    icon: Bell,
    label: '알림 설정',
    description: '운동 리마인더 설정하기',
    href: '/notifications',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    icon: Users,
    label: '그룹 관리',
    description: '그룹 정보 및 친구 초대',
    href: '/group',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100'
  },
  {
    icon: Settings,
    label: '설정',
    description: '프로필 및 앱 설정',
    href: '/settings',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100'
  }
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">빠른 실행</h3>
        <button
          onClick={() => {
            // 기능 가이드 다시 보기
            localStorage.removeItem('feature-guide-completed');
            window.location.reload();
          }}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <HelpCircle className="w-4 h-4" />
          <span>사용법 보기</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className={`${action.bgColor} rounded-lg p-4 text-left transition-colors border border-transparent hover:border-gray-200`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${action.bgColor.replace('hover:', '').replace('bg-', 'bg-').replace('-50', '-100')}`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                    {action.label}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 추가 도움말 */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          💡 <strong>처음 사용하시나요?</strong> 위의 &quot;사용법 보기&quot;를 클릭해서 앱 사용법을 확인해보세요!
        </p>
      </div>
    </div>
  );
}
