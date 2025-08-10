// Firebase 메시징 import
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Firebase 설정
firebase.initializeApp({
  apiKey: "AIzaSyBAs9z366924-1SRU2BSEAlvz1hekqvbW8",
  authDomain: "exercisemate.firebaseapp.com",
  projectId: "exercisemate",
  storageBucket: "exercisemate.firebasestorage.app",
  messagingSenderId: "587444057635",
  appId: "1:587444057635:web:02b045961b5cb6a16e2396"
});

const messaging = firebase.messaging();

const CACHE_NAME = 'exercisemate-v3'; // 버전 업데이트
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
  console.log('Service Worker installing...');
  // 즉시 활성화하여 백그라운드 알림 처리 보장
  self.skipWaiting();

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
  console.log('Service Worker activating...');
  // 모든 클라이언트를 즉시 제어하여 백그라운드 알림 보장
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
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
    ])
  );
  console.log('Service Worker activated and ready for background notifications');
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

// 푸시 이벤트는 Firebase 메시징에서 처리됨 (중복 제거)

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

// Firebase 메시징 백그라운드 처리
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);
  console.log('🔔 Service Worker is active and processing notification');

  const { title, body, icon } = payload.notification || {};
  const { type, url } = payload.data || {};

  // 알림 타입별 커스터마이징
  let notificationOptions = {
    body: body || '운동할 시간이에요! 💪',
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: type || 'exercise-reminder',
    requireInteraction: true, // 백그라운드에서는 true로 설정하여 지속성 보장
    silent: false, // 소리와 진동 활성화
    renotify: true, // 같은 태그의 알림이 있어도 다시 알림
    data: {
      url: url || '/dashboard',
      type: type || 'reminder',
      timestamp: Date.now()
    },
    actions: []
  };

  // 알림 타입별 설정
  switch (type) {
    case 'daily_reminder':
      notificationOptions.actions = [
        {
          action: 'exercise',
          title: '운동 기록하기',
          icon: '/icons/exercise-icon.png'
        },
        {
          action: 'snooze',
          title: '30분 후 알림',
          icon: '/icons/snooze-icon.png'
        }
      ];
      break;

    case 'goal_achievement':
      notificationOptions.icon = '/icons/trophy-icon.png';
      notificationOptions.badge = '/icons/trophy-badge.png';
      notificationOptions.tag = 'achievement';
      notificationOptions.actions = [
        {
          action: 'share',
          title: '친구에게 자랑하기',
          icon: '/icons/share-icon.png'
        }
      ];
      break;

    case 'penalty_warning':
      notificationOptions.icon = '/icons/warning-icon.png';
      notificationOptions.badge = '/icons/warning-badge.png';
      notificationOptions.tag = 'warning';
      notificationOptions.requireInteraction = true;
      notificationOptions.actions = [
        {
          action: 'exercise_now',
          title: '지금 운동하기',
          icon: '/icons/urgent-icon.png'
        }
      ];
      break;

    default:
      notificationOptions.actions = [
        {
          action: 'open',
          title: '앱 열기',
          icon: '/icons/open-icon.png'
        }
      ];
  }

  // 알림 표시 (백그라운드에서도 확실히 표시되도록)
  const notificationTitle = title || '🏃‍♂️ 오운완 챌린지';

  console.log('🔔 Showing notification:', notificationTitle, notificationOptions);

  // 알림 표시 시도
  const showNotificationPromise = self.registration.showNotification(
    notificationTitle,
    notificationOptions
  ).then(() => {
    console.log('✅ Notification displayed successfully');
  }).catch((error) => {
    console.error('❌ Failed to show notification:', error);

    // 실패 시 기본 알림으로 재시도
    return self.registration.showNotification(
      '🏃‍♂️ 운동 알림',
      {
        body: '운동할 시간이에요!',
        icon: '/icons/icon-192x192.png',
        tag: 'fallback-reminder',
        requireInteraction: true
      }
    );
  });

  return showNotificationPromise;
});

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
