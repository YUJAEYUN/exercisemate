const CACHE_NAME = 'exercisemate-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/character-select',
  '/group',
  '/penalty',
  '/manifest.json'
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request).then((response) => {
          // 유효한 응답인지 확인
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 응답을 복제하여 캐시에 저장
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: '오운완 챌린지',
    body: '운동할 시간이에요! 💪',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'exercise-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '운동 기록하기',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: '나중에',
        icon: '/icons/icon-96x96.png'
      }
    ],
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

  const { action } = event;
  const { url, type } = event.notification.data || {};

  let targetUrl = url || '/dashboard';

  // 액션별 처리
  switch (action) {
    case 'exercise':
    case 'exercise_now':
      targetUrl = '/dashboard';
      break;
    case 'share':
      targetUrl = '/dashboard?share=true';
      break;
    case 'view_penalty':
      targetUrl = '/penalty';
      break;
    case 'snooze':
      // 스누즈 알림 스케줄링
      scheduleSnoozeNotification();
      return;
    case 'dismiss':
      return;
    default:
      targetUrl = url || '/dashboard';
  }

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
      requireInteraction: true,
      data: { url: '/dashboard', type: 'snooze_reminder' },
      actions: [
        {
          action: 'exercise',
          title: '운동 기록하기',
          icon: '/icons/exercise-icon.png'
        },
        {
          action: 'snooze',
          title: '다시 30분 후',
          icon: '/icons/snooze-icon.png'
        }
      ]
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
