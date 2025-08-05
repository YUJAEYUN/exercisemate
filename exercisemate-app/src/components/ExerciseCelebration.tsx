'use client';

import { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { ExerciseType } from '@/types';

interface ExerciseCelebrationProps {
  isVisible: boolean;
  exerciseType: ExerciseType;
  character: 'cat' | 'dog';
  onComplete: () => void;
}

const celebrationMessages = {
  upper: [
    "💪 상체 운동 완료! 멋진 근육이 생겼어요!",
    "🔥 상체가 불타고 있어요! 대단해요!",
    "💯 팔 근육이 더 단단해졌어요!",
    "⚡ 상체 파워 업! 완벽한 운동이었어요!"
  ],
  lower: [
    "🦵 하체 운동 완료! 다리가 더 튼튼해졌어요!",
    "🏃‍♂️ 하체 파워 업! 달리기가 더 빨라질 거예요!",
    "💪 다리 근육이 탄탄해졌어요!",
    "🔥 하체가 불타고 있어요! 최고예요!"
  ],
  cardio: [
    "❤️ 유산소 운동 완료! 심장이 더 건강해졌어요!",
    "🏃‍♀️ 달리기 완료! 체력이 늘었어요!",
    "💨 숨이 차지만 기분 좋아요!",
    "⚡ 에너지가 넘쳐나요! 대단해요!"
  ]
};

const characterReactions = {
  cat: {
    upper: "🐱 냥냥! 팔 근육이 멋져요!",
    lower: "🐱 냥! 다리가 튼튼해졌어요!",
    cardio: "🐱 냥냥냥! 달리기 최고예요!"
  },
  dog: {
    upper: "🐶 멍멍! 팔 힘이 세졌어요!",
    lower: "🐶 멍! 다리가 강해졌어요!",
    cardio: "🐶 멍멍멍! 달리기 신나요!"
  }
};

export function ExerciseCelebration({ 
  isVisible, 
  exerciseType, 
  character, 
  onComplete 
}: ExerciseCelebrationProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [characterMessage, setCharacterMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // 랜덤 축하 메시지 선택
      const messages = celebrationMessages[exerciseType];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setCurrentMessage(randomMessage);
      
      // 캐릭터 반응 메시지
      setCharacterMessage(characterReactions[character][exerciseType]);
      
      // 컨페티 애니메이션 시작
      setShowConfetti(true);
      
      // 3초 후 자동으로 닫기
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, exerciseType, character, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-16 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center relative overflow-hidden">
        {/* 컨페티 애니메이션 */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              >
                {i % 4 === 0 && <Star className="w-4 h-4 text-yellow-400" />}
                {i % 4 === 1 && <Sparkles className="w-4 h-4 text-blue-400" />}
                {i % 4 === 2 && <Heart className="w-4 h-4 text-red-400" />}
                {i % 4 === 3 && <Zap className="w-4 h-4 text-green-400" />}
              </div>
            ))}
          </div>
        )}

        {/* 트로피 아이콘 */}
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Trophy className="w-10 h-10 text-yellow-600" />
        </div>

        {/* 캐릭터 이미지 */}
        <div className="w-24 h-24 mx-auto mb-4 animate-bounce">
          <Image
            src={character === 'cat' ? '/exercise_cat.png' : '/exercise_dog.png'}
            alt={character === 'cat' ? '운동하는 고양이' : '운동하는 강아지'}
            width={96}
            height={96}
            className="object-cover rounded-full"
          />
        </div>

        {/* 축하 메시지 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎉 운동 완료!
        </h2>
        
        <p className="text-lg text-gray-700 mb-3">
          {currentMessage}
        </p>

        {/* 캐릭터 반응 */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-blue-800 font-medium">
            {characterMessage}
          </p>
        </div>

        {/* 진행률 표시 */}
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <Zap className="w-4 h-4 text-green-500" />
          <span>오늘의 운동 목표 달성!</span>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onComplete}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}
