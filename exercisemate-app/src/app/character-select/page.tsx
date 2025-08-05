'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { Cat, Dog } from 'lucide-react';

export default function CharacterSelectPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCharacter, setSelectedCharacter] = useState<'cat' | 'dog' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCharacterSelect = async () => {
    if (!selectedCharacter || !user) return;

    try {
      setLoading(true);
      await updateUser(user.uid, { character: selectedCharacter });
      toast.success('캐릭터가 선택되었습니다!');
      router.push('/group');
    } catch (error) {
      console.error('Character selection error:', error);
      toast.error('캐릭터 선택에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            운동 메이트 선택하기
          </h1>
          <p className="text-gray-600">
            함께 운동할 캐릭터를 선택해주세요
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              selectedCharacter === 'cat'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => setSelectedCharacter('cat')}
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Cat className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">운동하는 고양이</h3>
                <p className="text-sm text-gray-600">
                  우아하고 유연한 운동을 좋아해요
                </p>
              </div>
              {selectedCharacter === 'cat' && (
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          <div
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              selectedCharacter === 'dog'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
            onClick={() => setSelectedCharacter('dog')}
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Dog className="w-8 h-8 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">운동하는 강아지</h3>
                <p className="text-sm text-gray-600">
                  활발하고 에너지 넘치는 운동을 좋아해요
                </p>
              </div>
              {selectedCharacter === 'dog' && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={handleCharacterSelect}
          disabled={!selectedCharacter || loading}
          loading={loading}
          className="w-full py-3"
        >
          {loading ? '선택 중...' : '캐릭터 선택하기'}
        </Button>
      </div>
    </div>
  );
}
