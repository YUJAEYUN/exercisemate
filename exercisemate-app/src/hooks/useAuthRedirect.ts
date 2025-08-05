import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UseAuthRedirectOptions {
  requireAuth?: boolean;
  requireCharacter?: boolean;
  requireGroup?: boolean;
  redirectTo?: string;
}

/**
 * 인증 상태에 따른 자동 리다이렉트 훅
 */
export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const {
    requireAuth = true,
    requireCharacter = false,
    requireGroup = false,
    redirectTo
  } = options;

  useEffect(() => {
    if (loading) return; // 로딩 중에는 리다이렉트하지 않음

    // 인증이 필요한데 사용자가 없는 경우
    if (requireAuth && !user) {
      router.push(redirectTo || '/');
      return;
    }

    // 사용자가 있는 경우의 추가 검증
    if (user) {
      // 캐릭터 선택이 필요한데 없는 경우
      if (requireCharacter && !user.character) {
        router.push('/character-select');
        return;
      }

      // 그룹이 필요한데 없는 경우
      if (requireGroup && !user.groupId) {
        router.push('/group');
        return;
      }
    }
  }, [user, loading, router, requireAuth, requireCharacter, requireGroup, redirectTo]);

  return { user, loading };
}

/**
 * 대시보드 페이지용 리다이렉트 훅
 */
export function useDashboardRedirect() {
  return useAuthRedirect({
    requireAuth: true,
    requireCharacter: true,
    requireGroup: true
  });
}

/**
 * 그룹 페이지용 리다이렉트 훅
 */
export function useGroupRedirect() {
  return useAuthRedirect({
    requireAuth: true,
    requireCharacter: true,
    requireGroup: false
  });
}

/**
 * 캐릭터 선택 페이지용 리다이렉트 훅
 */
export function useCharacterSelectRedirect() {
  return useAuthRedirect({
    requireAuth: true,
    requireCharacter: false,
    requireGroup: false
  });
}

/**
 * 설정 페이지용 리다이렉트 훅
 */
export function useSettingsRedirect() {
  return useAuthRedirect({
    requireAuth: true,
    requireCharacter: true,
    requireGroup: false
  });
}
