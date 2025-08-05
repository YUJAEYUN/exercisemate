# 🏋️‍♀️ 오운완 챌린지

친구와 함께하는 운동 습관 형성 챌린지 웹 애플리케이션

## 📱 주요 기능

### 🎯 핵심 기능

- **구글 OAuth 로그인**: 간편한 소셜 로그인
- **캐릭터 선택**: 귀여운 고양이 🐱 또는 강아지 🐶 캐릭터 선택
- **그룹 시스템**: 최대 2명까지 함께하는 운동 챌린지
- **운동 인증**: 하루 1회 운동 부위별 인증 (상체/하체/유산소)
- **주간 목표**: 월요일부터 일요일까지 주간 운동 목표 설정
- **벌칙 시스템**: 목표 미달성 시 재미있는 반성문 작성

### 🚀 기술적 특징

- **PWA 지원**: 앱처럼 설치하여 사용 가능
- **반응형 디자인**: 모바일 최적화된 토스 스타일 UI
- **실시간 동기화**: Firebase Firestore를 통한 실시간 데이터 동기화
- **오프라인 지원**: Service Worker를 통한 오프라인 캐싱

## 🛠️ 기술 스택

### Frontend

- **Next.js 14**: React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안전성을 위한 정적 타입 언어
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **React Hook Form**: 효율적인 폼 관리
- **React Hot Toast**: 사용자 친화적인 알림

### Backend & Database

- **Firebase Authentication**: 구글 OAuth 인증
- **Firebase Firestore**: NoSQL 실시간 데이터베이스
- **Firebase Cloud Messaging**: 푸시 알림 (향후 구현 예정)

### Development & Testing

- **Jest**: 단위 테스트 프레임워크
- **React Testing Library**: React 컴포넌트 테스트
- **ESLint**: 코드 품질 관리
- **TypeScript**: 컴파일 타임 타입 검사

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0.0 이상
- npm 또는 yarn
- Firebase 프로젝트 설정

### 설치 및 실행

1. **저장소 클론**

```bash
git clone <repository-url>
cd exercisemate-app
```

2. **의존성 설치**

```bash
npm install
```

3. **환경 변수 설정**
   `.env.local.example` 파일을 참고하여 `.env.local` 파일을 생성하고 Firebase 설정을 입력하세요.

```bash
cp .env.local.example .env.local
```

`.env.local` 파일에 다음 내용을 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. **개발 서버 실행**

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

### Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication 활성화 및 Google 로그인 제공업체 설정
3. Firestore Database 생성 (테스트 모드로 시작)
4. 프로젝트 설정에서 웹 앱 추가 및 구성 정보 복사

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── character-select/   # 캐릭터 선택 페이지
│   ├── dashboard/          # 메인 대시보드
│   ├── group/             # 그룹 관리 페이지
│   ├── penalty/           # 벌칙 시스템 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈페이지
├── components/            # 재사용 가능한 컴포넌트
│   ├── ui/               # UI 컴포넌트 (Button, Input 등)
│   ├── PWAInstaller.tsx  # PWA 설치 컴포넌트
│   └── PWAProvider.tsx   # PWA 프로바이더
├── contexts/             # React Context
│   └── AuthContext.tsx   # 인증 컨텍스트
├── lib/                  # 유틸리티 및 설정
│   ├── firebase.ts       # Firebase 설정
│   ├── firestore.ts      # Firestore 함수들
│   ├── utils.ts          # 유틸리티 함수
│   └── reflectionTemplates.ts # 반성문 템플릿
├── types/                # TypeScript 타입 정의
│   └── index.ts
└── __tests__/            # 테스트 파일
    ├── components/       # 컴포넌트 테스트
    └── utils.test.ts     # 유틸리티 함수 테스트
```

## 🧪 테스트

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 테스트 감시 모드
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage
```

### 테스트 커버리지

현재 테스트 커버리지 목표:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🏗️ 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

### 프로덕션 서버 실행

```bash
npm start
```

## 📱 PWA 기능

이 애플리케이션은 Progressive Web App(PWA)으로 구현되어 다음 기능을 제공합니다:

- **앱 설치**: 홈 화면에 추가하여 네이티브 앱처럼 사용
- **오프라인 지원**: 기본 기능의 오프라인 사용 가능
- **푸시 알림**: 운동 리마인더 및 친구 알림 (향후 구현)
- **빠른 로딩**: Service Worker를 통한 캐싱

## 🔒 보안 및 데이터베이스 규칙

Firestore 보안 규칙이 적용되어 있어 사용자는 자신의 데이터만 접근할 수 있습니다:

- 사용자는 자신의 문서만 읽고 쓸 수 있음
- 그룹 멤버만 그룹 데이터에 접근 가능
- 운동 기록은 같은 그룹 멤버만 조회 가능

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 생성해 주세요.

---

**즐거운 운동 습관 형성을 위해 오운완 챌린지와 함께하세요! 💪**
