'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  Bell,
  ArrowLeft,
  Clock,
  Calendar,
  Target,
  AlertTriangle,
  TestTube
} from 'lucide-react';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  updateNotificationSettings,
  generateAndSaveFCMToken,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  testServerNotification
} from '@/lib/notifications';
import { useClientNotifications } from '@/hooks/useClientNotifications';
import { NotificationStatus } from '@/components/NotificationPermissionRequest';
import { BackgroundNotificationGuide } from '@/components/BackgroundNotificationGuide';
import { toast } from 'react-hot-toast';

const DAYS_OF_WEEK = [
  { value: 0, label: '일', short: '일' },
  { value: 1, label: '월', short: '월' },
  { value: 2, label: '화', short: '화' },
  { value: 3, label: '수', short: '수' },
  { value: 4, label: '목', short: '목' },
  { value: 5, label: '금', short: '금' },
  { value: 6, label: '토', short: '토' },
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // 클라이언트 알림 훅 (무료)
  const { updateNotificationSchedule, showTestNotification } = useClientNotifications();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // 사용자의 알림 설정 로드
    if (user.notificationSettings) {
      setSettings(user.notificationSettings);
    }

    // 권한 상태 확인
    setPermissionStatus(getNotificationPermissionStatus());
  }, [user, router]);

  const handleToggleNotifications = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      if (!settings.enabled) {
        // 알림 활성화
        const granted = await requestNotificationPermission();
        
        if (granted) {
          const token = await generateAndSaveFCMToken(user.uid);
          
          if (token) {
            const newSettings = { ...settings, enabled: true };
            await updateNotificationSettings(user.uid, newSettings);
            setSettings(newSettings);
            setPermissionStatus('granted');
            toast.success('알림이 활성화되었습니다! 🔔');
          } else {
            toast.error('알림 설정 중 오류가 발생했습니다.');
          }
        } else {
          toast.error('알림 권한이 필요합니다.');
        }
      } else {
        // 알림 비활성화
        const newSettings = { ...settings, enabled: false };
        await updateNotificationSettings(user.uid, newSettings);
        setSettings(newSettings);
        toast.success('알림이 비활성화되었습니다.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('설정 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = async (time: string) => {
    if (!user) return;

    const newSettings = { ...settings, reminderTime: time };
    setSettings(newSettings);

    try {
      await updateNotificationSettings(user.uid, newSettings);
      updateNotificationSchedule(newSettings); // 클라이언트 스케줄 업데이트
      toast.success('알림 시간이 변경되었습니다.');
    } catch (error) {
      console.error('Error updating reminder time:', error);
      toast.error('시간 변경 중 오류가 발생했습니다.');
    }
  };

  // 즉시 테스트 알림 전송
  const handleSendTestNotification = async () => {
    if (!user) return;

    try {
      toast.loading('테스트 알림을 전송하고 있습니다...');

      // Firebase Functions의 sendTestNotification 호출
      const { sendTestNotification } = await import('@/lib/firebase-functions');

      const result = await sendTestNotification(user.uid);

      if (result.success) {
        toast.dismiss();
        toast.success('테스트 알림이 전송되었습니다! 곧 알림을 받으실 수 있습니다. 🎉');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error sending test notification:', error);
      toast.error('테스트 알림 전송 중 오류가 발생했습니다.');
    }
  };

  const handleDayToggle = async (day: number) => {
    if (!user) return;

    const newDays = settings.reminderDays.includes(day)
      ? settings.reminderDays.filter(d => d !== day)
      : [...settings.reminderDays, day].sort();

    const newSettings = { ...settings, reminderDays: newDays };
    setSettings(newSettings);

    try {
      await updateNotificationSettings(user.uid, newSettings);
      toast.success('알림 요일이 변경되었습니다.');
    } catch (error) {
      console.error('Error updating reminder days:', error);
      toast.error('요일 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSettingToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updateNotificationSettings(user.uid, newSettings);
      toast.success('설정이 변경되었습니다.');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('설정 변경 중 오류가 발생했습니다.');
    }
  };

  const handleTestNotification = () => {
    if (permissionStatus === 'granted') {
      showTestNotification();
      toast.success('클라이언트 테스트 알림을 전송했습니다!');
    } else {
      toast.error('알림 권한이 필요합니다.');
    }
  };

  const handleServerTestNotification = async () => {
    if (!user) return;

    if (permissionStatus !== 'granted') {
      toast.error('알림 권한이 필요합니다.');
      return;
    }

    if (!user.fcmToken) {
      toast.error('FCM 토큰이 없습니다. 알림을 다시 활성화해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // Firebase Auth 토큰 가져오기
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error('인증되지 않은 사용자입니다.');
        return;
      }

      const idToken = await currentUser.getIdToken();
      const result = await testServerNotification(user.uid, idToken);

      if (result.success) {
        toast.success('서버 푸시 알림을 전송했습니다! 🚀');
      } else {
        toast.error(`서버 알림 전송 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Server notification test error:', error);
      toast.error('서버 알림 테스트 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모든 사용자에게 테스트 알림 전송
  const handleTestReminderToAll = async () => {
    setIsLoading(true);

    try {
      const { sendTestReminderToAll } = await import('@/lib/fcmService');
      const result = await sendTestReminderToAll();

      if (result.success) {
        toast.success(`모든 사용자에게 테스트 알림을 전송했습니다! 🎉`);
      } else {
        toast.error(`테스트 알림 전송 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Test reminder error:', error);
      toast.error('테스트 알림 전송 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Bell className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">알림 설정</h1>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 백그라운드 알림 가이드 */}
        <BackgroundNotificationGuide />

        {/* 알림 상태 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">푸시 알림</h2>
              <p className="text-sm text-gray-600">운동 리마인더 및 알림 받기</p>
            </div>
            <NotificationStatus />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-700">알림 활성화</span>
            <button
              onClick={handleToggleNotifications}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${isLoading ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 알림 시간 설정 */}
        {settings.enabled && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">알림 시간</h3>
            </div>

            <div className="space-y-3">
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <Button
                onClick={handleSendTestNotification}
                variant="outline"
                className="w-full text-sm"
              >
                🔔 지금 즉시 테스트 알림 보내기
              </Button>
            </div>
          </div>
        )}

        {/* 알림 요일 설정 */}
        {settings.enabled && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">알림 요일</h3>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => handleDayToggle(day.value)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    settings.reminderDays.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 추가 알림 설정 */}
        {settings.enabled && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">추가 알림</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">목표 달성 알림</p>
                  <p className="text-sm text-gray-600">주간 목표 완료 시 알림</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingToggle('goalReminder', !settings.goalReminder)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.goalReminder ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.goalReminder ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">벌칙 경고 알림</p>
                  <p className="text-sm text-gray-600">마감일 임박 시 알림</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingToggle('penaltyWarning', !settings.penaltyWarning)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.penaltyWarning ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.penaltyWarning ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* 테스트 알림 */}
        {settings.enabled && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="font-medium text-gray-900 mb-3">알림 테스트</h3>

            {/* 클라이언트 알림 테스트 */}
            <Button
              onClick={handleTestNotification}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
            >
              <TestTube className="w-4 h-4" />
              <span>클라이언트 알림 테스트</span>
            </Button>

            {/* 서버 푸시 알림 테스트 */}
            <Button
              onClick={handleServerTestNotification}
              disabled={isLoading || !user?.fcmToken}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <TestTube className="w-4 h-4" />
              <span>
                {isLoading ? '전송 중...' : '서버 푸시 알림 테스트'}
              </span>
            </Button>

            {/* 모든 사용자에게 테스트 알림 */}
            <Button
              onClick={handleTestReminderToAll}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <TestTube className="w-4 h-4" />
              <span>
                {isLoading ? '전송 중...' : '모든 사용자에게 테스트 알림 📢'}
              </span>
            </Button>

            {!user?.fcmToken && (
              <p className="text-xs text-gray-500 text-center">
                FCM 토큰이 없습니다. 알림을 다시 활성화해주세요.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
