import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { startOfWeek, endOfWeek, format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { WeekCycle } from '@/types';

/**
 * Tailwind CSS 클래스를 병합하는 유틸리티 함수
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 현재 주의 월요일부터 일요일까지의 날짜 범위를 반환
 */
export function getCurrentWeekCycle(date: Date = new Date()): WeekCycle {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // 월요일 시작
  const end = endOfWeek(date, { weekStartsOn: 1 }); // 일요일 끝
  
  return {
    start,
    end,
    weekString: format(start, 'yyyy-MM-dd')
  };
}

/**
 * 특정 날짜가 속한 주의 사이클을 반환
 */
export function getWeekCycleForDate(date: Date): WeekCycle {
  return getCurrentWeekCycle(date);
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatDateKorean(date: Date): string {
  return format(date, 'M월 d일 (E)', { locale: ko });
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayString(): string {
  return formatDate(new Date());
}

/**
 * 주간 진행률 계산
 */
export function calculateWeeklyProgress(current: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.min((current / goal) * 100, 100);
}

/**
 * 벌칙까지 남은 일수 계산
 */
export function getDaysUntilPenalty(): number {
  const today = new Date();
  const currentWeek = getCurrentWeekCycle(today);
  const sunday = currentWeek.end;
  
  return differenceInDays(sunday, today);
}

/**
 * 랜덤 초대 코드 생성
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 운동 타입을 한국어로 변환
 */
export function getExerciseTypeLabel(type: 'upper' | 'lower' | 'cardio'): string {
  const labels = {
    upper: '상체',
    lower: '하체',
    cardio: '유산소'
  };
  return labels[type];
}

/**
 * 캐릭터 타입을 한국어로 변환
 */
export function getCharacterLabel(character: 'cat' | 'dog'): string {
  const labels = {
    cat: '고양이',
    dog: '강아지'
  };
  return labels[character];
}

/**
 * 진행률에 따른 색상 클래스 반환
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 진행률에 따른 배경 색상 클래스 반환
 */
export function getProgressBgColor(percentage: number): string {
  if (percentage >= 100) return 'bg-green-100';
  if (percentage >= 70) return 'bg-blue-100';
  if (percentage >= 40) return 'bg-yellow-100';
  return 'bg-red-100';
}

/**
 * 숫자를 한국어 서수로 변환 (1 -> 첫 번째, 2 -> 두 번째)
 */
export function getOrdinalKorean(num: number): string {
  const ordinals = ['', '첫', '두', '세', '네', '다섯', '여섯', '일곱'];
  if (num <= 7) {
    return `${ordinals[num]} 번째`;
  }
  return `${num}번째`;
}

/**
 * 배열을 랜덤하게 섞기
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 디바운스 함수
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 로컬 스토리지에 안전하게 데이터 저장
 */
export function setLocalStorage(key: string, value: unknown): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * 로컬 스토리지에서 안전하게 데이터 읽기
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
  }
  return defaultValue;
}

/**
 * 로컬 스토리지에서 데이터 제거
 */
export function removeLocalStorage(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

// 에러 처리 유틸리티
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleFirebaseError(error: unknown): AppError {
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message: string };

    switch (firebaseError.code) {
      case 'permission-denied':
        return new AppError(
          firebaseError.message,
          'PERMISSION_DENIED',
          '데이터 접근 권한이 없습니다. 잠시 후 다시 시도해주세요.'
        );
      case 'unavailable':
        return new AppError(
          firebaseError.message,
          'SERVICE_UNAVAILABLE',
          '서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
        );
      case 'not-found':
        return new AppError(
          firebaseError.message,
          'NOT_FOUND',
          '요청한 데이터를 찾을 수 없습니다.'
        );
      default:
        return new AppError(
          firebaseError.message,
          firebaseError.code,
          '알 수 없는 오류가 발생했습니다.'
        );
    }
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', '알 수 없는 오류가 발생했습니다.');
  }

  return new AppError('Unknown error', 'UNKNOWN_ERROR', '알 수 없는 오류가 발생했습니다.');
}

// 상수 관리
export const APP_CONSTANTS = {
  DEFAULT_MAX_MEMBERS: 2,
  REFRESH_DELAY: 500,
  REDIRECT_DELAY: 1000,
  EXERCISE_TYPES: {
    upper: '상체 운동',
    lower: '하체 운동',
    cardio: '유산소 운동'
  }
} as const;
