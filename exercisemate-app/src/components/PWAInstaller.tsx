'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWA가 이미 설치되었는지 확인
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // iOS Safari에서 홈 화면에 추가되었는지 확인
      if ((window.navigator as { standalone?: boolean }).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 설치 배너를 보여줄지 결정 (예: 사용자가 여러 번 방문한 후)
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;
      localStorage.setItem('visitCount', visitCount.toString());
      
      if (visitCount >= 3 && !isInstalled) {
        setShowInstallBanner(true);
      }
    };

    // 앱이 설치되었을 때
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // 일정 시간 후에 다시 보여주기 위해 타임스탬프 저장
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };

  // iOS Safari 사용자를 위한 설치 안내
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const isInStandaloneMode = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as { standalone?: boolean }).standalone === true;
  };

  if (isInstalled || isInStandaloneMode()) {
    return null;
  }

  // iOS Safari에서 홈 화면 추가 안내
  if (isIOS() && !isInStandaloneMode() && showInstallBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex-1 mr-4">
            <p className="text-sm font-medium">앱으로 설치하기</p>
            <p className="text-xs opacity-90">
              Safari 하단의 공유 버튼을 눌러 &quot;홈 화면에 추가&quot;를 선택하세요
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-white hover:bg-blue-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // 일반 브라우저에서 PWA 설치 배너
  if (showInstallBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex-1 mr-4">
            <p className="text-sm font-medium text-gray-900">앱으로 설치하기</p>
            <p className="text-xs text-gray-600">
              더 빠르고 편리하게 이용하세요
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-1" />
              설치
            </Button>
            <button
              onClick={handleDismiss}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Service Worker 등록 함수
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered: ', registration);
        
        // 업데이트 확인
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 버전이 설치됨을 사용자에게 알림
                console.log('New content is available; please refresh.');
              }
            });
          }
        });
      } catch (error) {
        console.log('SW registration failed: ', error);
      }
    });
  }
}
