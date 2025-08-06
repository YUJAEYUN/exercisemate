'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Zap, Users, Bell, MessageCircle, Trophy } from 'lucide-react';
import { Button } from './ui/Button';

interface GuideStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tip: string;
}

const guideSteps: GuideStep[] = [
  {
    icon: Zap,
    title: '운동 기록하기',
    description: '하루에 한 번, 운동 부위를 선택해서 기록하세요!',
    tip: '상체, 하체, 유산소 중 하나를 선택할 수 있어요. 매일 꾸준히 기록하는 것이 중요해요! 💪'
  },
  {
    icon: Users,
    title: '친구와 함께',
    description: '그룹 친구와 함께 운동하면 더 재미있어요!',
    tip: '친구가 운동하면 실시간 알림이 와요. 서로 응원하며 동기부여를 받아보세요! 🤝'
  },
  {
    icon: Bell,
    title: '알림 설정',
    description: '운동 리마인더로 꾸준한 습관을 만들어보세요!',
    tip: '설정에서 원하는 시간에 알림을 받을 수 있어요. 매일 같은 시간에 운동하는 습관을 만들어보세요! ⏰'
  },
  {
    icon: MessageCircle,
    title: '메시지 전송',
    description: '그룹 친구들에게 응원 메시지를 보내보세요!',
    tip: '운동 완료 축하나 동기부여 메시지를 보내서 함께 목표를 달성해보세요! 📱'
  },
  {
    icon: Trophy,
    title: '목표 달성',
    description: '주간 목표를 달성하고 성취감을 느껴보세요!',
    tip: '목표를 달성하지 못하면 재미있는 벌칙이 있어요. 하지만 걱정 마세요, 다시 도전할 수 있어요! 🎯'
  }
];

interface FeatureGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureGuide({ isOpen, onClose }: FeatureGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('feature-guide-completed', 'true');
    onClose();
  };

  const currentGuide = guideSteps[currentStep];
  const Icon = currentGuide.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 진행률 표시 */}
        <div className="flex space-x-2 mb-6">
          {guideSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full ${
                index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
          {currentGuide.title}
        </h2>

        {/* 설명 */}
        <p className="text-gray-700 text-center mb-4">
          {currentGuide.description}
        </p>

        {/* 팁 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            💡 <strong>팁:</strong> {currentGuide.tip}
          </p>
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handlePrev}
            variant="outline"
            disabled={currentStep === 0}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전</span>
          </Button>

          <span className="text-sm text-gray-500">
            {currentStep + 1} / {guideSteps.length}
          </span>

          {currentStep === guideSteps.length - 1 ? (
            <Button
              onClick={handleComplete}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              시작하기! 🚀
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
            >
              <span>다음</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
