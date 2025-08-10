'use client';

import { useEffect, useState } from 'react';
import { PWAInstaller } from './PWAInstaller';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Service Worker 등록 (Firebase 메시징 통합)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          // 통합된 서비스 워커 등록 (Firebase 메시징 포함)
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('SW registered with Firebase Messaging: ', registration);

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
  }, []);

  return (
    <>
      {children}
      {isClient && <PWAInstaller />}
    </>
  );
}
