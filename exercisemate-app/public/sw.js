const CACHE_NAME = 'exercisemate-v2'; // 버전 업데이트
const urlsToCache = [
  '/',
  '/dashboard',
  '/character-select',
  '/group',
  '/penalty',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  // chrome-extension, devtools, 또는 다른 스킴 요청은 무시
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // GET 요청만 캐시 처리
  if (event.request.method !== 'GET') {
    return;
  }

  // API 요청은 캐시하지 않음
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 캐시에 있으면 즉시 반환 (성능 우선)
        if (cachedResponse) {
          // 중요한 리소스만 백그라운드 업데이트
          if (event.request.url.includes('/dashboard') ||
              event.request.url.includes('/api/') ||
              event.request.url.endsWith('.js') ||
              event.request.url.endsWith('.css')) {

            // 백그라운드에서 최신 버전 가져오기 (throttled)
            setTimeout(() => {
              fetch(event.request)
                .then((freshResponse) => {
                  if (freshResponse && freshResponse.status === 200 && freshResponse.type === 'basic') {
                    caches.open(CACHE_NAME)
                      .then((cache) => {
                        cache.put(event.request, freshResponse.clone());
                      })
                      .catch(() => {});
                  }
                })
                .catch(() => {});
            }, 100); // 100ms 딜레이로 성능 향상
          }

          return cachedResponse;
        }

        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답인지 확인
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 중요한 리소스만 캐시 저장
            if (event.request.method === 'GET' &&
                !event.request.url.includes('/api/')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch(() => {});
            }

            return response;
          });
      })
      .catch(() => {
        // 캐시 조회 실패 시 네트워크에서 직접 가져오기
        return fetch(event.request);
      })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  // 기본 알림 설정 (actions 제거로 persistent 문제 해결)
  let notificationData = {
    title: '🏃‍♂️ 오운완 챌린지',
    body: '운동할 시간이에요! 💪',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'exercise-reminder',
    requireInteraction: false, // actions가 없으므로 false로 설정
    data: {
      url: '/dashboard',
      type: 'daily_reminder'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };

      // 알림 타입에 따른 커스터마이징
      if (payload.data?.type === 'goal_achievement') {
        notificationData.icon = '/icons/trophy-icon.png';
        notificationData.badge = '/icons/trophy-badge.png';
        notificationData.tag = 'goal-achievement';
      } else if (payload.data?.type === 'penalty_warning') {
        notificationData.icon = '/icons/warning-icon.png';
        notificationData.badge = '/icons/warning-badge.png';
        notificationData.tag = 'penalty-warning';
        notificationData.requireInteraction = true;
      }
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 알림 클릭 처리 (클라이언트 알림 지원)
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  const { url } = event.notification.data || {};
  const targetUrl = url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 탭이 있는지 확인
        for (const client of clientList) {
          if (client.url.includes(new URL(targetUrl, self.location.origin).pathname)) {
            if ('focus' in client) {
              return client.focus();
            }
          }
        }

        // 새 탭 열기
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// 스누즈 알림 스케줄링 함수
function scheduleSnoozeNotification() {
  setTimeout(() => {
    self.registration.showNotification('🔔 운동 리마인더', {
      body: '30분이 지났어요! 이제 운동할 시간입니다! 💪',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'snooze-reminder',
      requireInteraction: false,
      data: { url: '/dashboard', type: 'snooze_reminder' }
    });
  }, 30 * 60 * 1000); // 30분
}

// 백그라운드 동기화
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'exercise-reminder') {
    event.waitUntil(
      // 여기에 백그라운드에서 실행할 작업 추가
      console.log('Background sync: exercise reminder')
    );
  }
});

// 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // 알림 닫기 이벤트 추적 (선택사항)
  event.waitUntil(
    // 분석 데이터 전송 등
    console.log('Notification dismissed by user')
  );
});
