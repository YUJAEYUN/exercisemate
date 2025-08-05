# 🔥 Firebase 설정 가이드

Firebase 권한 오류를 해결하기 위한 단계별 가이드입니다.

## 🚨 즉시 해결 방법

### 1. Firebase 콘솔에서 Firestore 규칙 변경

1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Firestore Database** 클릭
4. **규칙** 탭 클릭
5. 기존 규칙을 다음으로 **임시 교체**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 개발용 임시 규칙 - 모든 읽기/쓰기 허용
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. **게시** 버튼 클릭

### 2. 앱 새로고침

브라우저에서 앱을 새로고침하면 권한 오류가 해결됩니다.

## 🔒 프로덕션용 보안 규칙 (나중에 적용)

개발이 완료되면 다음 보안 규칙을 적용하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서 규칙
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groupId != null &&
        exists(/databases/$(database)/documents/groups/$(get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groupId)) &&
        userId in get(/databases/$(database)/documents/groups/$(get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groupId)).data.members;
    }

    // 그룹 문서 규칙
    match /groups/{groupId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.createdBy &&
        request.auth.uid in request.resource.data.members;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.createdBy;
    }

    // 운동 기록 문서 규칙
    match /exerciseRecords/{recordId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/groups/$(resource.data.groupId)) &&
        request.auth.uid in get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.members;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }

    // 주간 통계 문서 규칙
    match /weeklyStats/{statId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/groups/$(resource.data.groupId)) &&
        request.auth.uid in get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.members;
      allow create, update: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## ⚠️ 주의사항

- 개발용 규칙은 **모든 인증된 사용자**에게 **모든 데이터**에 대한 읽기/쓰기 권한을 부여합니다
- 프로덕션 배포 전에 반드시 보안 규칙을 적용하세요
- 개발 중에만 사용하고, 실제 사용자 데이터가 있는 환경에서는 사용하지 마세요

## 🔍 Firestore 인덱스 문제 해결

"The query requires an index" 에러가 발생하는 경우:

### 방법 1: Firebase CLI 사용 (권장)

```bash
# Firebase CLI 설치 (아직 설치하지 않은 경우)
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화 (이미 한 경우 생략)
firebase init firestore

# 인덱스 배포
firebase deploy --only firestore:indexes
```

### 방법 2: Firebase 콘솔에서 수동 생성

1. [Firebase 콘솔](https://console.firebase.google.com/) 접속
2. Firestore Database > 인덱스 탭
3. 다음 복합 인덱스들을 생성:

**exerciseRecords 컬렉션:**

- `userId` (오름차순) + `date` (내림차순)
- `groupId` (오름차순) + `date` (내림차순)

**weeklyStats 컬렉션:**

- `userId` (오름차순) + `weekStart` (내림차순)
- `groupId` (오름차순) + `weekStart` (내림차순)

## 🔍 기타 문제 해결

만약 여전히 문제가 발생한다면:

1. Firebase 콘솔에서 Authentication > Users에서 사용자가 제대로 생성되었는지 확인
2. Firestore Database > 데이터에서 users 컬렉션이 생성되었는지 확인
3. 브라우저 개발자 도구 > 콘솔에서 상세한 오류 메시지 확인
4. Firebase 프로젝트 설정이 올바른지 확인 (.env.local 파일)
5. Firestore 인덱스가 제대로 생성되었는지 확인
