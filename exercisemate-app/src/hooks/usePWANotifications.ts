'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  generateAndSaveFCMToken, 
  setupForegroundMessageListener,
  getNotificationPermissionStatus 
} from '@/lib/notifications';
import { toast } from 'react-hot-toast';

interface PWANotificationState {
  isInstalled: boolean;
  hasPermission: boolean;
  isSupported: boolean;
  isLoading: boolean;
}

export function usePWANotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PWANotificationState>({
    isInstalled: false,
    hasPermission: false,
    isSupported: false,
    isLoading: false
  });

  // PWA 설치 상태 감지
  useEffect(() => {
    const checkPWAInstallation = () => {
      // 스탠드얼론 모드 확인
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // iOS Safari 홈 화면 추가 확인
      const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      
      // Android TWA 확인
      const isTWA = document.referrer.includes('android-app://');
      
      return isStandalone || isIOSStandalone || isTWA;
    };

    const checkNotificationSupport = () => {
      return 'Notification' in window && 'serviceWorker' in navigator;
    };

    setState(prev => ({
      ...prev,
      isInstalled: checkPWAInstallation(),
      isSupported: checkNotificationSupport(),
      hasPermission: getNotificationPermissionStatus() === 'granted'
    }));
  }, []);

  // PWA 설치 후 자동 알림 권한 요청
  useEffect(() => {
    if (!user || !state.isInstalled || !state.isSupported) return;

    const handlePWAInstallation = async () => {
      // PWA 설치 직후에만 자동 요청
      const hasAutoRequested = localStorage.getItem('pwa-notification-auto-requested');
      
      if (!hasAutoRequested && state.hasPermission === false) {
        setState(prev => ({ ...prev, isLoading: true }));
        
        try {
          const token = await generateAndSaveFCMToken(user.uid);
          
          if (token) {
            setState(prev => ({ ...prev, hasPermission: true }));
            toast.success('PWA 알림이 활성화되었습니다! 🎉');
            
            // 자동 요청 완료 표시
            localStorage.setItem('pwa-notification-auto-requested', 'true');
          }
        } catch (error) {
          console.error('Auto notification setup failed:', error);
        } finally {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    // 약간의 딜레이 후 실행 (PWA 설치 완료 대기)
    const timer = setTimeout(handlePWAInstallation, 2000);
    
    return () => clearTimeout(timer);
  }, [user, state.isInstalled, state.isSupported, state.hasPermission]);

  // 포그라운드 메시지 리스너 설정
  useEffect(() => {
    if (state.isSupported && state.hasPermission) {
      setupForegroundMessageListener();
    }
  }, [state.isSupported, state.hasPermission]);

  // 수동 알림 권한 요청
  const requestPermission = async () => {
    if (!user || !state.isSupported) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const token = await generateAndSaveFCMToken(user.uid);
      
      if (token) {
        setState(prev => ({ ...prev, hasPermission: true }));
        toast.success('알림이 활성화되었습니다! 🔔');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Manual notification setup failed:', error);
      toast.error('알림 설정에 실패했습니다.');
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // PWA 설치 프롬프트 표시 여부 결정
  const shouldShowInstallPrompt = () => {
    return !state.isInstalled && state.isSupported;
  };

  // 알림 권한 프롬프트 표시 여부 결정
  const shouldShowNotificationPrompt = () => {
    return state.isSupported && !state.hasPermission && !state.isLoading;
  };

  return {
    ...state,
    requestPermission,
    shouldShowInstallPrompt,
    shouldShowNotificationPrompt
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA 설치 이벤트 리스너
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 방문 횟수 기반 배너 표시
      const visitCount = parseInt(localStorage.getItem('pwa-visit-count') || '0') + 1;
      localStorage.setItem('pwa-visit-count', visitCount.toString());
      
      if (visitCount >= 3) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      
      // 설치 완료 이벤트 발생
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA installation');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    } finally {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-banner-dismissed', Date.now().toString());
  };

  return {
    canInstall: !!deferredPrompt,
    showInstallBanner,
    installPWA,
    dismissInstallBanner
  };
}

// 백그라운드 동기화 헬퍼
export function useBackgroundSync() {
  const registerBackgroundSync = async (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
        console.log(`Background sync registered: ${tag}`);
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  };

  return { registerBackgroundSync };
}
