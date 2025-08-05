'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Bell, Download, X, Smartphone } from 'lucide-react';
import { usePWANotifications, usePWAInstallPrompt } from '@/hooks/usePWANotifications';

export function PWANotificationBanner() {
  const {
    isInstalled,
    hasPermission,
    isSupported,
    isLoading,
    requestPermission,
    shouldShowNotificationPrompt
  } = usePWANotifications();

  const {
    canInstall,
    showInstallBanner,
    installPWA,
    dismissInstallBanner
  } = usePWAInstallPrompt();

  const [isDismissed, setIsDismissed] = useState(false);

  // 브라우저가 알림을 지원하지 않는 경우
  if (!isSupported) {
    return null;
  }

  // 이미 설치되고 알림 권한도 있는 경우
  if (isInstalled && hasPermission) {
    return null;
  }

  // 사용자가 배너를 닫은 경우
  if (isDismissed) {
    return null;
  }

  const handleInstallAndNotify = async () => {
    const installed = await installPWA();
    
    if (installed) {
      // PWA 설치 후 알림 권한 자동 요청은 usePWANotifications에서 처리
      setIsDismissed(true);
    }
  };

  const handleNotificationOnly = async () => {
    const granted = await requestPermission();
    
    if (granted) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (showInstallBanner) {
      dismissInstallBanner();
    }
  };

  // PWA 설치 + 알림 권한 배너
  if (!isInstalled && canInstall && showInstallBanner) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              📱 앱으로 설치하고 알림 받기
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              홈 화면에 추가하면 네이티브 앱처럼 사용할 수 있고, 
              운동 리마인더 알림도 받을 수 있어요!
            </p>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleInstallAndNotify}
                disabled={isLoading}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    앱 설치하기
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                나중에
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // 알림 권한만 요청하는 배너
  if (shouldShowNotificationPrompt()) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 mb-1">
              🔔 운동 리마인더 알림 받기
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              {isInstalled 
                ? "앱에서 운동 시간을 알려드리고, 목표 달성을 도와드릴게요!"
                : "매일 운동 시간을 알려드리고, 목표 달성을 도와드릴게요!"
              } 💪
            </p>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleNotificationOnly}
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

  return null;
}

// PWA 상태 표시 컴포넌트
export function PWAStatus() {
  const { isInstalled, hasPermission, isSupported } = usePWANotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <X className="w-4 h-4" />
        <span className="text-sm">PWA 미지원</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className={`flex items-center space-x-1 ${isInstalled ? 'text-green-600' : 'text-gray-500'}`}>
        <Smartphone className="w-4 h-4" />
        <span>{isInstalled ? 'PWA 설치됨' : 'PWA 미설치'}</span>
      </div>
      
      <div className={`flex items-center space-x-1 ${hasPermission ? 'text-green-600' : 'text-gray-500'}`}>
        <Bell className="w-4 h-4" />
        <span>{hasPermission ? '알림 활성화' : '알림 비활성화'}</span>
      </div>
    </div>
  );
}
