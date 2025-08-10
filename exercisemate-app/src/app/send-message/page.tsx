'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Send,
  Users,
  Dumbbell,
  Coffee,
  Zap,
  Heart,
  Trophy,
  Target
} from 'lucide-react';
import { getGroup } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import type { Group } from '@/types';

// 메시지 템플릿
const MESSAGE_TEMPLATES = [
  {
    id: 'workout_motivation',
    icon: Dumbbell,
    title: '운동 독려',
    message: '운동 가야지! 💪 오늘도 함께 목표를 향해 달려봐요!',
    emoji: '💪'
  },
  {
    id: 'coffee_break',
    icon: Coffee,
    title: '휴식 제안',
    message: '커피 한 잔 어때요? ☕ 잠깐 쉬어가면서 에너지 충전해요!',
    emoji: '☕'
  },
  {
    id: 'energy_boost',
    icon: Zap,
    title: '에너지 충전',
    message: '힘내세요! ⚡ 오늘 하루도 화이팅입니다!',
    emoji: '⚡'
  },
  {
    id: 'encouragement',
    icon: Heart,
    title: '응원 메시지',
    message: '당신은 할 수 있어요! ❤️ 포기하지 말고 끝까지 해봐요!',
    emoji: '❤️'
  },
  {
    id: 'goal_reminder',
    icon: Target,
    title: '목표 리마인더',
    message: '목표를 잊지 마세요! 🎯 조금씩이라도 꾸준히 해봐요!',
    emoji: '🎯'
  },
  {
    id: 'celebration',
    icon: Trophy,
    title: '축하 메시지',
    message: '축하해요! 🏆 정말 대단합니다! 계속 이런 식으로 해봐요!',
    emoji: '🏆'
  }
];

export default function SendMessagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(true);

  const loadGroupData = useCallback(async () => {
    if (!user?.groupId) return;

    try {
      const groupData = await getGroup(user.groupId);
      console.log('Loaded group data:', groupData);
      console.log('Group members:', groupData?.members);
      setGroup(groupData);
    } catch (error) {
      console.error('Error loading group:', error);
      toast.error('그룹 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingGroup(false);
    }
  }, [user?.groupId]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (!user.groupId) {
      toast.error('그룹에 가입되어 있지 않습니다.');
      router.push('/group');
      return;
    }

    loadGroupData();
  }, [user, router, loadGroupData]);

  const handleTemplateSelect = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setCustomMessage(template.message);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !group) return;

    const messageToSend = customMessage.trim();
    if (!messageToSend) {
      toast.error('메시지를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 그룹 멤버들에게 메시지 전송 (자신 제외)
      const targetUserIds = group.members.filter(memberId => memberId !== user.uid);

      console.log('Group members:', group.members);
      console.log('Current user ID:', user.uid);
      console.log('Target user IDs:', targetUserIds);

      if (targetUserIds.length === 0) {
        toast.error('메시지를 받을 그룹 멤버가 없습니다.');
        return;
      }

      // Firebase Functions를 사용하여 알림 전송
      const { sendNotificationToUsers } = await import('@/lib/fcmService');

      const result = await sendNotificationToUsers(
        targetUserIds,
        `💬 ${user.displayName || '그룹 멤버'}님의 메시지`,
        messageToSend,
        {
          type: 'group_message',
          senderId: user.uid,
          senderName: user.displayName || '그룹 멤버',
          groupId: group.id,
          timestamp: new Date().toISOString(),
          url: '/dashboard'
        }
      );

      if (result.success) {
        toast.success(`${result.successCount}명에게 메시지를 전송했습니다! 🎉`);
        setCustomMessage('');
        setSelectedTemplate('');

        if (result.failureCount > 0) {
          console.warn(`${result.failureCount}명에게 전송 실패`);
        }
      } else {
        toast.error('메시지 전송에 실패했습니다.');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loadingGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">그룹 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">그룹 메시지 보내기</h1>
              <p className="text-sm text-gray-600">
                {group?.name} • {(group?.members?.length || 1) - 1}명에게 전송
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 그룹 정보 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{group?.name}</h3>
              <p className="text-sm text-gray-600">
                총 {group?.members?.length || 0}명 (나 제외 {(group?.members?.length || 1) - 1}명에게 전송)
              </p>
            </div>
          </div>
        </div>

        {/* 메시지 템플릿 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-medium text-gray-900 mb-4">빠른 메시지 템플릿</h3>
          <div className="grid grid-cols-2 gap-3">
            {MESSAGE_TEMPLATES.map((template) => {
              const IconComponent = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <IconComponent className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {template.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {template.message}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 메시지 입력 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-medium text-gray-900 mb-4">메시지 내용</h3>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="그룹 멤버들에게 보낼 메시지를 입력하세요..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
            maxLength={200}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {customMessage.length}/200자
            </span>
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !customMessage.trim()}
              className="flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? '전송 중...' : '메시지 전송'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
