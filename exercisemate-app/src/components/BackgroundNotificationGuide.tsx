'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Smartphone, 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  X,
  Download,
  Settings
} from 'lucide-react';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt';

interface BackgroundNotificationGuideProps {
  onClose?: () => void;
}

export function BackgroundNotificationGuide({ onClose }: BackgroundNotificationGuideProps) {
  const { isInstalled, hasPermission, isSupported } = usePWANotifications();
  const { canInstall, installPWA } = usePWAInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    isChrome: boolean;
    isSafari: boolean;
    isFirefox: boolean;
  }>({ name: '', isChrome: false, isSafari: false, isFirefox: false });

  useEffect(() => {
    // 브라우저 감지
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    
    let name = 'Unknown';
    if (isChrome) name = 'Chrome';
    else if (isSafari) name = 'Safari';
    else if (isFirefox) name = 'Firefox';
    
    setBrowserInfo({ name, isChrome, isSafari, isFirefox });

    // 이전에 가이드를 본 적이 있는지 확인
    const hasSeenGuide = localStorage.getItem('background-notification-guide-seen');
    if (hasSeenGuide) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('background-notification-guide-seen', 'true');
    onClose?.();
  };

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      // 설치 후 가이드 닫기
      handleDismiss();
    }
  };

  // 이미 완벽하게 설정된 경우 표시하지 않음
  if (!isSupported || (isInstalled && hasPermission) || isDismissed) {
    return null;
  }

  const getRecommendations = () => {
    const recommendations = [];

    if (!isInstalled && canInstall) {
      recommendations.push({
        icon: Download,
        title: 'PWA 앱으로 설치하기',
        description: '홈 화면에 추가하면 백그라운드 알림이 더 안정적으로 작동합니다.',
        action: '설치하기',
        onAction: handleInstall,
        priority: 'high'
      });
    }

    if (!hasPermission) {
      recommendations.push({
        icon: Bell,
        title: '알림 권한 허용',
        description: '브라우저 설정에서 알림을 허용해주세요.',
        action: '설정으로 이동',
        onAction: () => {
          // 브라우저 설정 페이지로 이동하는 방법 안내
          if (browserInfo.isChrome) {
            alert('Chrome 설정 > 개인정보 보호 및 보안 > 사이트 설정 > 알림에서 허용해주세요.');
          } else if (browserInfo.isSafari) {
            alert('Safari 설정 > 웹사이트 > 알림에서 허용해주세요.');
          } else {
            alert('브라우저 설정에서 이 사이트의 알림을 허용해주세요.');
          }
        },
        priority: 'medium'
      });
    }

    // 브라우저별 추가 안내
    if (browserInfo.isSafari && !isInstalled) {
      recommendations.push({
        icon: Smartphone,
        title: 'Safari 사용자 안내',
        description: 'Safari에서는 홈 화면에 추가해야 백그라운드 알림이 작동합니다.',
        action: '방법 보기',
        onAction: () => {
          alert('Safari에서 공유 버튼 > 홈 화면에 추가를 선택해주세요.');
        },
        priority: 'high'
      });
    }

    if (browserInfo.isFirefox) {
      recommendations.push({
        icon: AlertCircle,
        title: 'Firefox 사용자 안내',
        description: 'Firefox에서는 백그라운드 알림 지원이 제한적일 수 있습니다.',
        action: '대안 확인',
        onAction: () => {
          alert('Chrome이나 Edge 브라우저 사용을 권장합니다.');
        },
        priority: 'low'
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">
              백그라운드 알림 설정 안내
            </h3>
            <p className="text-sm text-amber-700">
              앱을 종료해도 알림을 받으려면 아래 설정이 필요합니다.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const Icon = rec.icon;
          const priorityColors = {
            high: 'bg-red-100 text-red-700 border-red-200',
            medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            low: 'bg-gray-100 text-gray-700 border-gray-200'
          };

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
            >
              <div className="flex items-start space-x-3">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium">{rec.title}</h4>
                  <p className="text-sm mt-1">{rec.description}</p>
                </div>
                <Button
                  onClick={rec.onAction}
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {rec.action}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-blue-700">
          <CheckCircle className="w-4 h-4" />
          <span>
            현재 상태: {browserInfo.name} 브라우저, 
            {isInstalled ? ' PWA 설치됨' : ' PWA 미설치'}, 
            {hasPermission ? ' 알림 허용됨' : ' 알림 미허용'}
          </span>
        </div>
      </div>
    </div>
  );
}
