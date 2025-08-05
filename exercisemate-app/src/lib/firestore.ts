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
import { generateInviteCode, getCurrentWeekCycle, formatDate, APP_CONSTANTS } from './utils';

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
    maxMembers: APP_CONSTANTS.DEFAULT_MAX_MEMBERS,
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
  
  const maxMembers = group.maxMembers || APP_CONSTANTS.DEFAULT_MAX_MEMBERS; // 기존 그룹 호환성을 위한 기본값
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
  console.log('logExercise called with:', { userId, groupId, exerciseType: data.exerciseType });

  if (!groupId) {
    throw new Error('그룹에 가입되어 있지 않습니다.');
  }

  const today = formatDate(new Date());

  // Race condition 방지를 위해 고유한 문서 ID 사용
  const recordId = `${userId}_${today}`;
  const recordRef = doc(exerciseRecordsRef, recordId);

  const recordData: Omit<ExerciseRecord, 'id'> = {
    userId,
    groupId,
    date: today,
    exerciseType: data.exerciseType,
    createdAt: Timestamp.now()
  };

  try {
    // 문서가 이미 존재하는지 확인하고 없을 때만 생성
    const existingDoc = await getDoc(recordRef);
    if (existingDoc.exists()) {
      throw new Error('오늘은 이미 운동을 기록했습니다.');
    }

    console.log('Saving exercise record:', recordData);
    await setDoc(recordRef, recordData);
    console.log('Exercise record saved successfully');

    // 주간 통계 업데이트
    console.log('Starting weekly stats update...');
    await updateWeeklyStats(userId, groupId);
    console.log('Weekly stats update completed');
  } catch (error) {
    // Firestore 에러를 사용자 친화적 메시지로 변환
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new Error('오늘은 이미 운동을 기록했습니다.');
    }
    throw error;
  }
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
  try {
    const weekCycle = getCurrentWeekCycle(new Date(weekStart));
    const weekEnd = formatDate(weekCycle.end);

    console.log('Querying weekly records from', weekStart, 'to', weekEnd);

    // 가장 단순한 쿼리만 사용 (인덱스 에러 방지)
    const q = query(
      exerciseRecordsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseRecord));

    console.log('All user records:', allRecords.length);

    // 클라이언트 사이드에서 날짜 필터링
    const filteredRecords = allRecords.filter(record => {
      const recordDate = record.date;
      const isInRange = recordDate >= weekStart && recordDate <= weekEnd;
      console.log(`Record ${recordDate}: ${isInRange ? 'IN' : 'OUT'} of range ${weekStart} - ${weekEnd}`);
      return isInRange;
    });

    console.log('Found weekly records:', filteredRecords.length, 'out of', allRecords.length, 'total records');
    return filteredRecords;
  } catch (error) {
    console.error('Error in getWeeklyExerciseRecords:', error);
    // 에러 발생 시 빈 배열 반환
    return [];
  }
}

// 주간 통계 관련 함수들
async function updateWeeklyStats(userId: string, groupId: string): Promise<void> {
  try {
    const weekCycle = getCurrentWeekCycle();
    const weekStart = weekCycle.weekString;

    console.log('Updating weekly stats for user:', userId, 'week:', weekStart);

    // 이번 주 운동 기록 개수 계산
    const records = await getWeeklyExerciseRecords(userId, weekStart);
    const exerciseCount = records.length;

    console.log('Found exercise records:', exerciseCount, 'records:', records);

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

    console.log('Saving weekly stats:', statsData);
    await setDoc(doc(weeklyStatsRef, statsId), statsData);
    console.log('Weekly stats updated successfully');
  } catch (error) {
    console.error('Failed to update weekly stats:', error);
    // 주간 통계 업데이트 실패해도 운동 기록은 저장되도록 에러를 던지지 않음
  }
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
