'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CharacterSelector } from '@/components/CharacterSelector';
import { getUser } from '@/lib/firestore';

export default function CharacterSelectPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const handleCharacterComplete = async () => {
    if (!user) return;

    // AuthContext의 사용자 정보 새로고침
    await refreshUser();

    // 최신 사용자 정보를 다시 가져와서 groupId 확인
    try {
      const latestUserData = await getUser(user.uid);

      // 그룹이 있으면 대시보드로, 없으면 그룹 설정으로
      if (latestUserData?.groupId) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/group';
      }
    } catch (error) {
      console.error('Failed to get latest user data:', error);
      // 에러 발생 시 기본 동작
      window.location.href = '/group';
    }
  };

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <CharacterSelector
          currentCharacter={user.character}
          userId={user.uid}
          onComplete={handleCharacterComplete}
          showTitle={true}
          showDescription={true}
        />
      </div>
    </div>
  );
}