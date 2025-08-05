# 🚀 ExerciseMate Vercel 배포 가이드

## 📋 **배포 전 준비사항**

### 1️⃣ **Firebase 설정**

#### A. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: exercisemate)

#### B. Firebase 서비스 활성화
```bash
# 필요한 서비스들
✅ Authentication (Google 로그인)
✅ Firestore Database
✅ Cloud Messaging (푸시 알림)
```

#### C. Firebase Admin SDK 키 생성
1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드 및 보관

#### D. VAPID 키 생성
1. Firebase Console → 프로젝트 설정 → Cloud Messaging
2. "웹 푸시 인증서" → "키 쌍 생성"
3. 생성된 키 복사

### 2️⃣ **환경 변수 설정**

#### `.env.local` 파일 생성
```bash
# Firebase 클라이언트 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Firebase Admin 설정 (Vercel Serverless Functions용)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## 🚀 **Vercel 배포**

### 1️⃣ **Vercel CLI 설치**
```bash
npm i -g vercel
```

### 2️⃣ **Vercel 로그인**
```bash
vercel login
```

### 3️⃣ **프로젝트 배포**
```bash
# 프로젝트 루트에서
vercel

# 프로덕션 배포
vercel --prod
```

### 4️⃣ **환경 변수 설정**
```bash
# Vercel 대시보드에서 설정
1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. 위의 환경 변수들 모두 추가
```

## 🔧 **배포 후 설정**

### 1️⃣ **Firebase 도메인 설정**
```bash
# Firebase Console → Authentication → Settings
# 승인된 도메인에 Vercel 도메인 추가
your-app.vercel.app
```

### 2️⃣ **Firestore 보안 규칙 배포**
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 보안 규칙 배포
firebase deploy --only firestore:rules
```

### 3️⃣ **PWA 설정 확인**
```bash
# manifest.json의 start_url 확인
"start_url": "/dashboard"

# 서비스 워커 등록 확인
/public/sw.js
```

## ✅ **배포 확인 체크리스트**

### 🔐 **인증 기능**
- [ ] Google 로그인 동작
- [ ] 사용자 정보 저장
- [ ] 로그아웃 동작

### 👥 **그룹 기능**
- [ ] 그룹 생성
- [ ] 초대 코드로 참여
- [ ] 그룹 멤버 표시

### 💪 **운동 기록**
- [ ] 운동 기록 저장
- [ ] 주간 통계 업데이트
- [ ] 진행률 표시

### 🔔 **알림 기능**
- [ ] PWA 설치 프롬프트
- [ ] 알림 권한 요청
- [ ] 개인 리마인더 알림
- [ ] 친구 운동 완료 알림
- [ ] 목표 달성 알림

### 📱 **PWA 기능**
- [ ] 홈 화면 추가 가능
- [ ] 오프라인 동작
- [ ] 푸시 알림 수신

## 🐛 **문제 해결**

### 알림이 안 와요
```bash
1. VAPID 키 확인
2. Firebase Admin 키 확인
3. Vercel 환경 변수 확인
4. 브라우저 알림 권한 확인
```

### PWA 설치가 안 돼요
```bash
1. HTTPS 연결 확인 (Vercel은 자동 HTTPS)
2. manifest.json 확인
3. 서비스 워커 등록 확인
```

### 친구 알림이 안 와요
```bash
1. Vercel Functions 로그 확인
2. Firebase Admin 권한 확인
3. FCM 토큰 유효성 확인
```

## 📊 **모니터링**

### Vercel 대시보드
- Functions 실행 로그
- 에러 추적
- 성능 모니터링

### Firebase Console
- Firestore 사용량
- Authentication 사용자
- Cloud Messaging 전송량

## 🎉 **배포 완료!**

축하합니다! 이제 완전 무료로 친구 알림까지 지원하는 운동 챌린지 앱이 배포되었습니다!

- 🆓 **완전 무료**: Vercel + Firebase 무료 플랜
- 📱 **PWA 지원**: 네이티브 앱 경험
- 🔔 **완벽한 알림**: 개인 + 친구 알림
- 👥 **그룹 기능**: 친구와 함께 운동

**배포 URL**: https://your-app.vercel.app
