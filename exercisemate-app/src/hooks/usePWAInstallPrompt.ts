'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptState {
  canInstall: boolean;
  showInstallBanner: boolean;
  isInstalling: boolean;
}

export function usePWAInstallPrompt() {
  const [state, setState] = useState<PWAInstallPromptState>({
    canInstall: false,
    showInstallBanner: false,
    isInstalling: false
  });
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // PWA가 이미 설치되었는지 확인
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      
      // iOS Safari에서 홈 화면에 추가되었는지 확인
      if ((window.navigator as { standalone?: boolean }).standalone === true) {
        return true;
      }
      
      return false;
    };

    const isInstalled = checkIfInstalled();

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      if (!isInstalled) {
        setState(prev => ({ 
          ...prev, 
          canInstall: true 
        }));
        
        // 설치 배너를 보여줄지 결정 (예: 사용자가 여러 번 방문한 후)
        const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;
        localStorage.setItem('visitCount', visitCount.toString());
        
        if (visitCount >= 2) {
          setState(prev => ({ 
            ...prev, 
            showInstallBanner: true 
          }));
        }
      }
    };

    // appinstalled 이벤트 리스너
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setState(prev => ({ 
        ...prev, 
        canInstall: false,
        showInstallBanner: false,
        isInstalling: false
      }));
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    setState(prev => ({ ...prev, isInstalling: true }));

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response to the install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setState(prev => ({ 
          ...prev, 
          canInstall: false,
          showInstallBanner: false,
          isInstalling: false
        }));
        setDeferredPrompt(null);
        return true;
      } else {
        setState(prev => ({ ...prev, isInstalling: false }));
        return false;
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      setState(prev => ({ ...prev, isInstalling: false }));
      return false;
    }
  };

  const dismissInstallBanner = () => {
    setState(prev => ({ ...prev, showInstallBanner: false }));
    localStorage.setItem('install-banner-dismissed', Date.now().toString());
  };

  return {
    canInstall: state.canInstall,
    showInstallBanner: state.showInstallBanner,
    isInstalling: state.isInstalling,
    installPWA,
    dismissInstallBanner
  };
}
