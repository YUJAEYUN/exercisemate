'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { updateUser } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface CharacterSelectorProps {
  currentCharacter?: 'cat' | 'dog';
  userId: string;
  onCharacterChange?: (character: 'cat' | 'dog') => void;
  onComplete?: () => void;
  showTitle?: boolean;
  showDescription?: boolean;
}

export function CharacterSelector({
  currentCharacter,
  userId,
  onCharacterChange,
  onComplete,
  showTitle = true,
  showDescription = true
}: CharacterSelectorProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<'cat' | 'dog'>(currentCharacter || 'cat');
  const [loading, setLoading] = useState(false);

  const handleCharacterSelect = (character: 'cat' | 'dog') => {
    setSelectedCharacter(character);
    onCharacterChange?.(character);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateUser(userId, { character: selectedCharacter });
      toast.success('캐릭터가 변경되었습니다!');
      onComplete?.();
    } catch (error) {
      console.error('Character update error:', error);
      toast.error('캐릭터 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            운동 친구 선택
          </h2>
          {showDescription && (
            <p className="text-gray-600">
              함께 운동할 친구를 선택해주세요
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* 고양이 캐릭터 */}
        <button
          onClick={() => handleCharacterSelect('cat')}
          className={`p-6 rounded-xl border-2 transition-all ${
            selectedCharacter === 'cat'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
              <Image
                src="/exercise_cat.png"
                alt="운동하는 고양이"
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">고양이</h3>
            <p className="text-sm text-gray-600">🐱 냥냥! 함께 운동해요!</p>
          </div>
        </button>

        {/* 강아지 캐릭터 */}
        <button
          onClick={() => handleCharacterSelect('dog')}
          className={`p-6 rounded-xl border-2 transition-all ${
            selectedCharacter === 'dog'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
              <Image
                src="/exercise_dog.png"
                alt="운동하는 강아지"
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">강아지</h3>
            <p className="text-sm text-gray-600">🐶 멍멍! 같이 운동하자!</p>
          </div>
        </button>
      </div>

      <Button
        onClick={handleSave}
        loading={loading}
        disabled={loading}
        className="w-full py-3"
      >
        {loading ? '저장 중...' : '선택 완료'}
      </Button>
    </div>
  );
}
