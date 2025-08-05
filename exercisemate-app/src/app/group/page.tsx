'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGroupRedirect } from '@/hooks/useAuthRedirect';
import { useLoading } from '@/contexts/LoadingContext';
import { useRouter } from 'next/navigation';
import {
  createGroup,
  joinGroupByInviteCode,
  getGroup,
  leaveGroup,
  updateGroup,
  getUser
} from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import {
  Users,
  Plus,
  UserPlus,
  Copy,
  Edit3,
  UserMinus,
  Save,
  X
} from 'lucide-react';
import type { Group, User as UserType } from '@/types';
import { GroupPageSkeleton } from '@/components/ui/Skeleton';

export default function GroupPage() {
  const { user, loading: authLoading } = useGroupRedirect();
  const { withLoading } = useLoading();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'manage'>('create');
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<UserType[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // 그룹 생성 폼
  const [groupName, setGroupName] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  // 그룹 참여 폼
  const [inviteCode, setInviteCode] = useState('');

  // 그룹 편집 폼
  const [editGroupName, setEditGroupName] = useState('');
  const [editWeeklyGoal, setEditWeeklyGoal] = useState(3);
  const [editMaxMembers, setEditMaxMembers] = useState(2);

  const loadGroupData = useCallback(async () => {
    if (!user?.groupId) return;

    try {
      const groupData = await getGroup(user.groupId);
      if (groupData) {
        setGroup(groupData);
        setEditGroupName(groupData.name);
        setEditWeeklyGoal(groupData.weeklyGoal);
        setEditMaxMembers(groupData.maxMembers || 2);

        // 그룹 멤버 정보 로드
        const members = await Promise.all(
          groupData.members.map(async (memberId) => {
            const memberData = await getUser(memberId);
            return memberData;
          })
        );
        setGroupMembers(members.filter(Boolean) as UserType[]);
      }
    } catch (error) {
      console.error('Group data loading error:', error);
      toast.error('그룹 정보를 불러오는데 실패했습니다.');
    }
  }, [user?.groupId]);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.groupId) {
        setLoading(true);
        loadGroupData().finally(() => setLoading(false));
        setActiveTab('manage');
      } else {
        setActiveTab('create');
        setLoading(false);
      }
    }
  }, [user, authLoading, loadGroupData]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupName.trim()) return;

    await withLoading(async () => {
      try {
        await createGroup(user.uid, {
          name: groupName.trim(),
          weeklyGoal
        });

        toast.success('그룹이 생성되었습니다!');

        // 실시간 리스너가 자동으로 사용자 정보를 업데이트하므로 약간의 딜레이 후 이동
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } catch (error) {
        console.error('Group creation error:', error);
        toast.error('그룹 생성에 실패했습니다.');
      }
    }, '그룹을 생성하는 중...');
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    await withLoading(async () => {
      try {
        await joinGroupByInviteCode(user.uid, inviteCode.trim().toUpperCase());

        toast.success('그룹에 참여했습니다!');

        // 실시간 리스너가 자동으로 사용자 정보를 업데이트하므로 약간의 딜레이 후 이동
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } catch (error: unknown) {
        console.error('Group join error:', error);
        const errorMessage = error instanceof Error ? error.message : '그룹 참여에 실패했습니다.';
        toast.error(errorMessage);
      }
    }, '그룹에 참여하는 중...');
  };

  const handleUpdateGroup = async () => {
    if (!group || !user) return;

    try {
      setLoading(true);
      await updateGroup(group.id, {
        name: editGroupName.trim(),
        weeklyGoal: editWeeklyGoal,
        maxMembers: editMaxMembers
      });
      setGroup({ ...group, name: editGroupName.trim(), weeklyGoal: editWeeklyGoal, maxMembers: editMaxMembers });
      setIsEditing(false);
      toast.success('그룹 정보가 업데이트되었습니다.');
    } catch (error) {
      console.error('Group update error:', error);
      toast.error('그룹 정보 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !user) return;

    if (confirm('정말로 그룹을 나가시겠습니까?')) {
      await withLoading(async () => {
        try {
          await leaveGroup(user.uid, group.id);

          toast.success('그룹에서 나갔습니다.');

          // 실시간 리스너가 자동으로 사용자 정보를 업데이트하므로 약간의 딜레이 후 이동
          setTimeout(() => {
            router.push('/group');
          }, 1000);
        } catch (error) {
          console.error('Leave group error:', error);
          toast.error('그룹 나가기에 실패했습니다.');
        }
      }, '그룹에서 나가는 중...');
    }
  };

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      toast.success('초대 코드가 복사되었습니다!');
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return <GroupPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              {group ? '그룹 관리' : '그룹 설정'}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* 그룹이 있는 경우 - 그룹 관리 */}
        {group ? (
          <div className="space-y-6">
            {/* 그룹 정보 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">그룹 정보</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  {isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      그룹 이름
                    </label>
                    <Input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="그룹 이름"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      주간 목표 (회)
                    </label>
                    <select
                      value={editWeeklyGoal}
                      onChange={(e) => setEditWeeklyGoal(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={num}>주 {num}회</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최대 멤버 수
                    </label>
                    <select
                      value={editMaxMembers}
                      onChange={(e) => setEditMaxMembers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num}명</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleUpdateGroup}
                      loading={loading}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">그룹 이름</p>
                    <p className="font-medium text-gray-900">{group.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">주간 목표</p>
                    <p className="font-medium text-gray-900">주 {group.weeklyGoal}회</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">최대 멤버 수</p>
                    <p className="font-medium text-gray-900">{group.maxMembers || 2}명</p>
                  </div>
                </div>
              )}
            </div>

            {/* 초대 코드 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">초대 코드</h3>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <p className="font-mono text-lg font-bold text-center text-gray-900">
                    {group.inviteCode}
                  </p>
                </div>
                <Button
                  onClick={copyInviteCode}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                친구에게 이 코드를 공유해서 그룹에 초대하세요
              </p>
            </div>

            {/* 그룹 멤버 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">그룹 멤버</h3>
                <span className="text-sm text-gray-600">{groupMembers.length}/{group.maxMembers || 2}명</span>
              </div>

              <div className="space-y-3">
                {groupMembers.map((member) => (
                  <div key={member.uid} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {member.displayName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {member.displayName}
                        {member.uid === user.uid && ' (나)'}
                      </p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                    {member.uid !== user.uid && group.createdBy === user.uid && (
                      <button
                        onClick={() => {
                          // TODO: 멤버 제거 기능 구현
                        }}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 그룹 나가기 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <Button
                onClick={handleLeaveGroup}
                variant="danger"
                className="w-full"
                loading={loading}
              >
                그룹 나가기
              </Button>
            </div>
          </div>
        ) : (
          /* 그룹이 없는 경우 - 그룹 생성/참여 */
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                운동 그룹 설정
              </h2>
              <p className="text-gray-600">
                친구와 함께 운동 챌린지를 시작해보세요
              </p>
            </div>

            {/* 탭 버튼 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('create')}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                그룹 만들기
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'join'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('join')}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                그룹 참여하기
              </button>
            </div>

            {/* 그룹 생성 폼 */}
            {activeTab === 'create' && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      그룹 이름
                    </label>
                    <Input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="예: 헬창 친구들"
                      required
                      maxLength={20}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      주간 운동 목표 (회)
                    </label>
                    <select
                      value={weeklyGoal}
                      onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={num}>
                          주 {num}회
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={!groupName.trim() || loading}
                    loading={loading}
                    className="w-full py-3"
                  >
                    {loading ? '생성 중...' : '그룹 만들기'}
                  </Button>
                </form>
              </div>
            )}

            {/* 그룹 참여 폼 */}
            {activeTab === 'join' && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      초대 코드
                    </label>
                    <Input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="6자리 초대 코드 입력"
                      required
                      maxLength={6}
                      className="uppercase"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      친구에게 받은 6자리 초대 코드를 입력해주세요
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={inviteCode.length !== 6 || loading}
                    loading={loading}
                    className="w-full py-3"
                  >
                    {loading ? '참여 중...' : '그룹 참여하기'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
