// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 설정 - 환경변수에서 주입됨
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const { title, body, icon } = payload.notification || {};
  const { type, url } = payload.data || {};
  
  // 알림 타입별 커스터마이징
  let notificationOptions = {
    body: body || '운동할 시간이에요! 💪',
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: type || 'exercise-reminder',
    requireInteraction: true,
    data: {
      url: url || '/dashboard',
      type: type || 'reminder',
      timestamp: Date.now()
    },
    actions: []
  };
  
  // 타입별 액션 버튼 설정
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
          title: '성과 공유하기',
          icon: '/icons/share-icon.png'
        },
        {
          action: 'view',
          title: '대시보드 보기',
          icon: '/icons/dashboard-icon.png'
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
        },
        {
          action: 'view_penalty',
          title: '반성문 보기',
          icon: '/icons/penalty-icon.png'
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
  
  // 알림 표시
  self.registration.showNotification(
    title || '🏃‍♂️ 오운완 챌린지',
    notificationOptions
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  const { action } = event;
  const { url, type } = event.notification.data || {};
  
  let targetUrl = url || '/dashboard';
  
  // 액션별 URL 결정
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
      // 30분 후 다시 알림 (백그라운드 동기화 사용)
      self.registration.sync.register('snooze-reminder');
      return;
    default:
      targetUrl = url || '/dashboard';
  }
  
  // 앱 열기 또는 포커스
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 탭 찾기
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

// 백그라운드 동기화 - 스누즈 알림
self.addEventListener('sync', (event) => {
  if (event.tag === 'snooze-reminder') {
    event.waitUntil(
      // 30분 후 알림을 위한 타이머 설정
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification('🔔 운동 리마인더', {
            body: '30분이 지났어요! 이제 운동할 시간입니다! 💪',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'snooze-reminder',
            data: { url: '/dashboard', type: 'snooze_reminder' },
            actions: [
              {
                action: 'exercise',
                title: '운동 기록하기',
                icon: '/icons/exercise-icon.png'
              }
            ]
          });
          resolve();
        }, 30 * 60 * 1000); // 30분
      })
    );
  }
});

// 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // 분석 데이터 전송 (선택사항)
  const { type } = event.notification.data || {};
  
  // 백그라운드 동기화로 분석 데이터 전송
  if (type) {
    self.registration.sync.register(`notification-closed-${type}`);
  }
});

// PWA 설치 후 알림 권한 자동 요청
self.addEventListener('appinstalled', (event) => {
  console.log('PWA installed, requesting notification permission');
  
  // 설치 후 알림 권한 요청 신호
  self.registration.sync.register('request-notification-permission');
});

// 오프라인 알림 큐잉
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-notifications') {
    event.waitUntil(
      // IndexedDB에서 대기 중인 알림 처리
      processOfflineNotifications()
    );
  }
});

// 오프라인 알림 처리 함수
async function processOfflineNotifications() {
  try {
    // IndexedDB에서 대기 중인 알림 가져오기
    const notifications = await getQueuedNotifications();
    
    for (const notification of notifications) {
      await self.registration.showNotification(
        notification.title,
        notification.options
      );
      
      // 처리된 알림 제거
      await removeQueuedNotification(notification.id);
    }
  } catch (error) {
    console.error('Error processing offline notifications:', error);
  }
}

// IndexedDB 헬퍼 함수들 (간단한 구현)
async function getQueuedNotifications() {
  // 실제 구현에서는 IndexedDB 사용
  return [];
}

async function removeQueuedNotification(id) {
  // 실제 구현에서는 IndexedDB에서 제거
  console.log('Removing queued notification:', id);
}
