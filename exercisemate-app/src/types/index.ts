import { Timestamp } from 'firebase/firestore';

// 사용자 타입
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  character: 'cat' | 'dog';
  groupId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 그룹 타입
export interface Group {
  id: string;
  name: string;
  members: string[]; // user UIDs
  weeklyGoal: number; // 주간 운동 목표 횟수
  inviteCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // user UID
}

// 운동 기록 타입
export interface ExerciseRecord {
  id: string;
  userId: string;
  groupId: string;
  date: string; // YYYY-MM-DD 형식
  exerciseType: 'upper' | 'lower' | 'cardio'; // 상체, 하체, 유산소
  createdAt: Timestamp;
}

// 주간 통계 타입
export interface WeeklyStats {
  userId: string;
  groupId: string;
  weekStart: string; // YYYY-MM-DD 형식 (월요일)
  exerciseCount: number;
  goal: number;
  isRestWeek: boolean; // 쉬는 주 여부
}

// 벌칙 타입
export interface Penalty {
  id: string;
  userId: string;
  groupId: string;
  weekStart: string; // YYYY-MM-DD 형식 (월요일)
  reason: string;
  template: string;
  completed: boolean;
  createdAt: Timestamp;
}

// 반성문 템플릿 타입
export interface ReflectionTemplate {
  id: string;
  title: string;
  content: string;
  category: 'funny' | 'serious' | 'cute';
}

// 캐릭터 상태 타입
export type CharacterStatus = 'success' | 'failure' | 'resting' | 'neutral';

// 운동 부위 타입
export type ExerciseType = 'upper' | 'lower' | 'cardio';

// 알림 타입
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'exercise_reminder' | 'friend_exercise' | 'penalty_warning' | 'weekly_summary';
  read: boolean;
  createdAt: Timestamp;
}

// 주간 사이클 유틸리티 타입
export interface WeekCycle {
  start: Date; // 월요일
  end: Date;   // 일요일
  weekString: string; // YYYY-MM-DD 형식
}

// 폼 데이터 타입들
export interface CharacterSelectForm {
  character: 'cat' | 'dog';
}

export interface GroupCreateForm {
  name: string;
  weeklyGoal: number;
}

export interface ExerciseLogForm {
  exerciseType: ExerciseType;
}

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 컨텍스트 타입들
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface GroupContextType {
  group: Group | null;
  loading: boolean;
  createGroup: (data: GroupCreateForm) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
  updateWeeklyGoal: (goal: number) => Promise<void>;
}

// 통계 관련 타입
export interface DashboardStats {
  todayExercised: boolean;
  weeklyProgress: {
    current: number;
    goal: number;
    percentage: number;
  };
  friendProgress?: {
    name: string;
    current: number;
    goal: number;
    percentage: number;
  };
  daysUntilPenalty: number;
  isRestWeek: boolean;
}
