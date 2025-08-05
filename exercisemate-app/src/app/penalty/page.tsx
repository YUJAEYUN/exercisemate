'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { 
  FileText, 
  Share2, 
  Copy, 
  ArrowLeft,
  Shuffle
} from 'lucide-react';
import { getRandomTemplate, getTemplatesByCategory } from '@/lib/reflectionTemplates';
import type { ReflectionTemplate } from '@/types';

export default function PenaltyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<Omit<ReflectionTemplate, 'id'> | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'funny' | 'serious' | 'cute'>('funny');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // 랜덤 템플릿으로 시작
    const randomTemplate = getRandomTemplate();
    setSelectedTemplate(randomTemplate);
    setCustomContent(randomTemplate.content);
  }, [user, router]);

  const handleCategoryChange = (category: 'funny' | 'serious' | 'cute') => {
    setSelectedCategory(category);
    const templates = getTemplatesByCategory(category);
    if (templates.length > 0) {
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      setSelectedTemplate(randomTemplate);
      setCustomContent(randomTemplate.content);
    }
  };

  const handleRandomTemplate = () => {
    const randomTemplate = getRandomTemplate();
    setSelectedTemplate(randomTemplate);
    setCustomContent(randomTemplate.content);
    setSelectedCategory(randomTemplate.category);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customContent);
      toast.success('반성문이 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '오운완 챌린지 반성문',
          text: customContent,
        });
      } catch (error) {
        console.error('Share failed:', error);
        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error('공유에 실패했습니다.');
        }
      }
    } else {
      // Web Share API를 지원하지 않는 경우 클립보드 복사
      handleCopyToClipboard();
    }
  };

  const fillTemplate = (content: string): string => {
    const today = new Date().toLocaleDateString('ko-KR');
    const userName = user?.displayName || '운동 실패자';
    
    return content
      .replace(/\[이름\]/g, userName)
      .replace(/\[날짜\]/g, today)
      .replace(/\[목표횟수\]/g, '3')
      .replace(/\[달성횟수\]/g, '1');
  };

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">반성문 작성</h1>
              <p className="text-sm text-gray-600">목표 미달성에 대한 반성의 시간</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRandomTemplate}
              variant="outline"
              size="sm"
            >
              <Shuffle className="w-4 h-4 mr-1" />
              랜덤
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 카테고리 선택 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">반성문 스타일 선택</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleCategoryChange('funny')}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedCategory === 'funny'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-yellow-300'
              }`}
            >
              <div className="text-2xl mb-1">😄</div>
              <div className="text-sm font-medium">재미있게</div>
            </button>
            <button
              onClick={() => handleCategoryChange('serious')}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedCategory === 'serious'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm font-medium">진지하게</div>
            </button>
            <button
              onClick={() => handleCategoryChange('cute')}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedCategory === 'cute'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 hover:border-pink-300'
              }`}
            >
              <div className="text-2xl mb-1">🥺</div>
              <div className="text-sm font-medium">귀엽게</div>
            </button>
          </div>
        </div>

        {/* 반성문 템플릿 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{selectedTemplate.title}</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {isEditing ? '미리보기' : '편집하기'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="반성문을 작성해주세요..."
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {fillTemplate(customContent)}
              </pre>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex space-x-3">
          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            복사하기
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            공유하기
          </Button>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">반성문 작성 가이드</p>
              <ul className="space-y-1 text-blue-700">
                <li>• 솔직하고 재미있게 작성해보세요</li>
                <li>• 다음 주 목표 달성을 위한 구체적인 계획을 세워보세요</li>
                <li>• 운동 메이트에게 진심 어린 메시지를 남겨보세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
