'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createGroup, joinGroupByInviteCode } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { Users, Plus, UserPlus } from 'lucide-react';

export default function GroupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  
  // 그룹 생성 폼
  const [groupName, setGroupName] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  
  // 그룹 참여 폼
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupName.trim()) return;

    try {
      setLoading(true);
      await createGroup(user.uid, {
        name: groupName.trim(),
        weeklyGoal
      });
      toast.success('그룹이 생성되었습니다!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Group creation error:', error);
      toast.error('그룹 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    try {
      setLoading(true);
      await joinGroupByInviteCode(user.uid, inviteCode.trim().toUpperCase());
      toast.success('그룹에 참여했습니다!');
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Group join error:', error);
      const errorMessage = error instanceof Error ? error.message : '그룹 참여에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            운동 그룹 설정
          </h1>
          <p className="text-gray-600">
            친구와 함께 운동 챌린지를 시작해보세요
          </p>
        </div>

        {/* 탭 버튼 */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
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
        )}

        {/* 그룹 참여 폼 */}
        {activeTab === 'join' && (
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
        )}
      </div>
    </div>
  );
}
