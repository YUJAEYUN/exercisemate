'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Bell, BellOff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  requestNotificationPermission, 
  generateAndSaveFCMToken,
  getNotificationPermissionStatus,
  isNotificationSupported
} from '@/lib/notifications';
import { toast } from 'react-hot-toast';

interface NotificationPermissionRequestProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  showBanner?: boolean;
}

export function NotificationPermissionRequest({
  onPermissionGranted,
  onPermissionDenied,
  showBanner = true
}: NotificationPermissionRequestProps) {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 브라우저 지원 확인
    setIsSupported(isNotificationSupported());
    
    if (isNotificationSupported()) {
      const status = getNotificationPermissionStatus();
      setPermissionStatus(status);
      
      // 권한이 아직 요청되지 않았고, 배너를 보여줘야 하는 경우
      if (status === 'default' && showBanner) {
        // 사용자가 이전에 배너를 닫았는지 확인
        const dismissed = localStorage.getItem('notification-banner-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        if (dismissedTime < oneDayAgo) {
          setShowPrompt(true);
        }
      }
    }
  }, [showBanner]);

  const handleRequestPermission = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const granted = await requestNotificationPermission();
      
      if (granted) {
        setPermissionStatus('granted');
        
        // FCM 토큰 생성 및 저장
        const token = await generateAndSaveFCMToken(user.uid);
        
        if (token) {
          toast.success('알림이 활성화되었습니다! 🔔');
          onPermissionGranted?.();
        } else {
          toast.error('알림 설정 중 오류가 발생했습니다.');
        }
      } else {
        setPermissionStatus('denied');
        toast.error('알림 권한이 거부되었습니다.');
        onPermissionDenied?.();
      }
      
      setShowPrompt(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('알림 권한 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-banner-dismissed', Date.now().toString());
  };

  // 브라우저가 알림을 지원하지 않는 경우
  if (!isSupported) {
    return null;
  }

  // 이미 권한이 부여되었거나 거부된 경우 배너 숨김
  if (permissionStatus !== 'default' || !showPrompt) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-900 mb-1">
            운동 리마인더 알림 받기
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            매일 운동 시간을 알려드리고, 목표 달성을 도와드릴게요! 💪
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isLoading}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-1" />
                  알림 허용
                </>
              )}
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              나중에
            </Button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600 flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// 권한 상태 표시 컴포넌트
export function NotificationStatus() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    if (isNotificationSupported()) {
      setPermissionStatus(getNotificationPermissionStatus());
    }
  }, []);

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <BellOff className="w-4 h-4" />
        <span className="text-sm">알림 미지원</span>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: <Bell className="w-4 h-4 text-green-600" />,
          text: '알림 활성화',
          color: 'text-green-600'
        };
      case 'denied':
        return {
          icon: <BellOff className="w-4 h-4 text-red-600" />,
          text: '알림 차단됨',
          color: 'text-red-600'
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-gray-500" />,
          text: '알림 미설정',
          color: 'text-gray-500'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`flex items-center space-x-2 ${statusInfo.color}`}>
      {statusInfo.icon}
      <span className="text-sm">{statusInfo.text}</span>
    </div>
  );
}
