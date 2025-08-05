import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  Group,
  ExerciseRecord,
  WeeklyStats,
  ReflectionTemplate,
  GroupCreateForm,
  ExerciseLogForm
} from '@/types';
import { generateInviteCode, getCurrentWeekCycle, formatDate } from './utils';

// 컬렉션 참조
const usersRef = collection(db, 'users');
const groupsRef = collection(db, 'groups');
const exerciseRecordsRef = collection(db, 'exerciseRecords');
const weeklyStatsRef = collection(db, 'weeklyStats');
const reflectionTemplatesRef = collection(db, 'reflectionTemplates');

// 사용자 관련 함수들
export async function createUser(uid: string, userData: Partial<User>): Promise<void> {
  const userDoc = doc(usersRef, uid);
  const now = Timestamp.now();
  
  await setDoc(userDoc, {
    uid,
    ...userData,
    createdAt: now,
    updatedAt: now
  });
}

export async function getUser(uid: string): Promise<User | null> {
  const userDoc = doc(usersRef, uid);
  const snapshot = await getDoc(userDoc);
  
  if (snapshot.exists()) {
    return snapshot.data() as User;
  }
  return null;
}

export async function updateUser(uid: string, updates: Partial<User>): Promise<void> {
  const userDoc = doc(usersRef, uid);
  await updateDoc(userDoc, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

// 그룹 관련 함수들
export async function createGroup(createdBy: string, data: GroupCreateForm): Promise<string> {
  const groupId = doc(groupsRef).id;
  const inviteCode = generateInviteCode();
  const now = Timestamp.now();
  
  const groupData: Omit<Group, 'id'> = {
    name: data.name,
    members: [createdBy],
    weeklyGoal: data.weeklyGoal,
    maxMembers: 2, // 기본값
    inviteCode,
    createdAt: now,
    updatedAt: now,
    createdBy
  };
  
  await setDoc(doc(groupsRef, groupId), groupData);
  
  // 사용자의 groupId 업데이트
  await updateUser(createdBy, { groupId });
  
  return groupId;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const groupDoc = doc(groupsRef, groupId);
  const snapshot = await getDoc(groupDoc);
  
  if (snapshot.exists()) {
    return { id: groupId, ...snapshot.data() } as Group;
  }
  return null;
}

export async function joinGroupByInviteCode(userId: string, inviteCode: string): Promise<string> {
  const q = query(groupsRef, where('inviteCode', '==', inviteCode));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('유효하지 않은 초대 코드입니다.');
  }
  
  const groupDoc = snapshot.docs[0];
  const group = groupDoc.data() as Group;
  
  const maxMembers = group.maxMembers || 2; // 기존 그룹 호환성을 위한 기본값
  if (group.members.length >= maxMembers) {
    throw new Error(`그룹이 가득 찼습니다. (최대 ${maxMembers}명)`);
  }
  
  if (group.members.includes(userId)) {
    throw new Error('이미 그룹에 참여하고 있습니다.');
  }
  
  // 그룹에 멤버 추가
  await updateDoc(groupDoc.ref, {
    members: [...group.members, userId],
    updatedAt: Timestamp.now()
  });
  
  // 사용자의 groupId 업데이트
  await updateUser(userId, { groupId: groupDoc.id });
  
  return groupDoc.id;
}

export async function updateGroup(groupId: string, updates: Partial<Pick<Group, 'name' | 'weeklyGoal' | 'maxMembers'>>): Promise<void> {
  const groupDoc = doc(groupsRef, groupId);
  await updateDoc(groupDoc, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

// 사용자의 모든 운동 기록과 통계 삭제 (소프트 리셋)
export async function resetUserExerciseData(userId: string): Promise<void> {
  const batch = writeBatch(db);

  // 사용자의 모든 운동 기록 삭제
  const exerciseRecordsQuery = query(
    exerciseRecordsRef,
    where('userId', '==', userId)
  );
  const exerciseRecordsSnapshot = await getDocs(exerciseRecordsQuery);
  exerciseRecordsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 사용자의 모든 주간 통계 삭제
  const weeklyStatsQuery = query(
    weeklyStatsRef,
    where('userId', '==', userId)
  );
  const weeklyStatsSnapshot = await getDocs(weeklyStatsQuery);
  weeklyStatsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('그룹을 찾을 수 없습니다.');

  const updatedMembers = group.members.filter(id => id !== userId);

  if (updatedMembers.length === 0) {
    // 마지막 멤버가 나가면 그룹 삭제
    await deleteDoc(doc(groupsRef, groupId));
  } else {
    // 멤버 목록에서 제거
    await updateDoc(doc(groupsRef, groupId), {
      members: updatedMembers,
      updatedAt: Timestamp.now()
    });
  }

  // 사용자의 모든 운동 기록과 통계 삭제 (소프트 리셋)
  await resetUserExerciseData(userId);

  // 사용자의 groupId 제거
  await updateUser(userId, { groupId: undefined });
}

// 운동 기록 관련 함수들
export async function logExercise(
  userId: string, 
  groupId: string, 
  data: ExerciseLogForm
): Promise<void> {
  const today = formatDate(new Date());
  
  // 오늘 이미 운동했는지 확인
  const q = query(
    exerciseRecordsRef,
    where('userId', '==', userId),
    where('date', '==', today)
  );
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    throw new Error('오늘은 이미 운동을 기록했습니다.');
  }
  
  const recordId = doc(exerciseRecordsRef).id;
  const recordData: Omit<ExerciseRecord, 'id'> = {
    userId,
    groupId,
    date: today,
    exerciseType: data.exerciseType,
    createdAt: Timestamp.now()
  };
  
  await setDoc(doc(exerciseRecordsRef, recordId), recordData);
  
  // 주간 통계 업데이트
  await updateWeeklyStats(userId, groupId);
}

export async function getTodayExercise(userId: string): Promise<ExerciseRecord | null> {
  const today = formatDate(new Date());
  const q = query(
    exerciseRecordsRef,
    where('userId', '==', userId),
    where('date', '==', today),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ExerciseRecord;
  }
  
  return null;
}

export async function getWeeklyExerciseRecords(
  userId: string,
  weekStart: string
): Promise<ExerciseRecord[]> {
  const weekCycle = getCurrentWeekCycle(new Date(weekStart));
  const weekEnd = formatDate(weekCycle.end);
  
  const q = query(
    exerciseRecordsRef,
    where('userId', '==', userId),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
    orderBy('date', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseRecord));
}

// 주간 통계 관련 함수들
async function updateWeeklyStats(userId: string, groupId: string): Promise<void> {
  const weekCycle = getCurrentWeekCycle();
  const weekStart = weekCycle.weekString;
  
  // 이번 주 운동 기록 개수 계산
  const records = await getWeeklyExerciseRecords(userId, weekStart);
  const exerciseCount = records.length;
  
  // 그룹 정보에서 목표 가져오기
  const group = await getGroup(groupId);
  const goal = group?.weeklyGoal || 3;
  
  const statsId = `${userId}_${weekStart}`;
  const statsData: Omit<WeeklyStats, 'userId'> & { userId: string } = {
    userId,
    groupId,
    weekStart,
    exerciseCount,
    goal,
    isRestWeek: false // 기본값, 나중에 수동으로 설정 가능
  };
  
  await setDoc(doc(weeklyStatsRef, statsId), statsData);
}

export async function getWeeklyStats(userId: string, weekStart: string): Promise<WeeklyStats | null> {
  const statsId = `${userId}_${weekStart}`;
  const statsDoc = doc(weeklyStatsRef, statsId);
  const snapshot = await getDoc(statsDoc);
  
  if (snapshot.exists()) {
    return snapshot.data() as WeeklyStats;
  }
  return null;
}

export async function setRestWeek(userId: string, weekStart: string, isRestWeek: boolean): Promise<void> {
  const statsId = `${userId}_${weekStart}`;
  await updateDoc(doc(weeklyStatsRef, statsId), { isRestWeek });
}

// 반성문 템플릿 관련 함수들
export async function getReflectionTemplates(): Promise<ReflectionTemplate[]> {
  const q = query(reflectionTemplatesRef, orderBy('category'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReflectionTemplate));
}

// 실시간 리스너 함수들
export function subscribeToGroup(groupId: string, callback: (group: Group | null) => void): Unsubscribe {
  const groupDoc = doc(groupsRef, groupId);
  
  return onSnapshot(groupDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: groupId, ...snapshot.data() } as Group);
    } else {
      callback(null);
    }
  });
}

export function subscribeToUserExerciseRecords(
  userId: string,
  callback: (records: ExerciseRecord[]) => void
): Unsubscribe {
  const q = query(
    exerciseRecordsRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(30)
  );
  
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseRecord));
    callback(records);
  });
}
