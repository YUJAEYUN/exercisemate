'use client';

import { useCharacterSelectRedirect } from '@/hooks/useAuthRedirect';
import { useRouter } from 'next/navigation';
import { CharacterSelector } from '@/components/CharacterSelector';

export default function CharacterSelectPage() {
  const { user, loading: authLoading } = useCharacterSelectRedirect();
  const router = useRouter();

  const handleCharacterComplete = () => {
    if (!user) return;

    // 실시간 리스너가 자동으로 사용자 정보를 업데이트하므로 약간의 딜레이 후 이동
    setTimeout(() => {
      // 그룹이 있으면 대시보드로, 없으면 그룹 설정으로
      if (user.groupId) {
        router.push('/dashboard');
      } else {
        router.push('/group');
      }
    }, 500);
  };

  if (authLoading || !user) {
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