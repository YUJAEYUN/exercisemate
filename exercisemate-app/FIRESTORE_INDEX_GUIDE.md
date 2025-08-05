# 🔥 Firestore 인덱스 문제 해결 가이드

"The query requires an index" 에러를 해결하는 방법입니다.

## 🚨 즉시 해결 방법

### 방법 1: 자동 인덱스 생성 (가장 쉬움)

1. **브라우저 개발자 도구**를 열고 **콘솔** 탭을 확인
2. 에러 메시지에서 **파란색 링크**를 클릭
   ```
   The query requires an index. You can create it here: https://console.firebase.google.com/...
   ```
3. 링크를 클릭하면 Firebase 콘솔이 열리고 **자동으로 인덱스가 생성**됩니다
4. 인덱스 생성이 완료되면 (보통 1-2분) 앱을 새로고침

### 방법 2: Firebase 콘솔에서 수동 생성

1. [Firebase 콘솔](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. **Firestore Database** > **인덱스** 탭 클릭
4. **복합 인덱스 만들기** 버튼 클릭
5. 다음 인덱스들을 하나씩 생성:

#### exerciseRecords 컬렉션 인덱스
```
컬렉션 ID: exerciseRecords
필드:
- userId (오름차순)
- date (내림차순)
```

```
컬렉션 ID: exerciseRecords  
필드:
- groupId (오름차순)
- date (내림차순)
```

#### weeklyStats 컬렉션 인덱스
```
컬렉션 ID: weeklyStats
필드:
- userId (오름차순)
- weekStart (내림차순)
```

```
컬렉션 ID: weeklyStats
필드:
- groupId (오름차순)
- weekStart (내림차순)
```

### 방법 3: Firebase CLI 사용 (개발자용)

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화 (이미 한 경우 생략)
firebase init firestore

# 인덱스 배포
firebase deploy --only firestore:indexes
```

## 🔍 인덱스 생성 확인

1. Firebase 콘솔 > Firestore Database > 인덱스
2. 상태가 **"빌드 중"**에서 **"사용 설정됨"**으로 변경될 때까지 대기
3. 모든 인덱스가 **"사용 설정됨"** 상태가 되면 앱 새로고침

## ⚠️ 주의사항

- 인덱스 생성에는 **1-5분** 정도 소요됩니다
- 인덱스가 생성되는 동안에는 해당 쿼리가 실패할 수 있습니다
- **자동 인덱스 생성 링크**를 사용하는 것이 가장 확실합니다

## 🎯 문제가 계속 발생하는 경우

1. **브라우저 캐시 삭제** 후 새로고침
2. **시크릿/프라이빗 모드**에서 테스트
3. Firebase 콘솔에서 **인덱스 상태** 재확인
4. 다른 브라우저에서 테스트

## 📋 필요한 인덱스 목록

현재 앱에서 필요한 모든 인덱스:

| 컬렉션 | 필드 1 | 필드 2 | 용도 |
|--------|--------|--------|------|
| exerciseRecords | userId (↑) | date (↓) | 사용자별 운동 기록 조회 |
| exerciseRecords | groupId (↑) | date (↓) | 그룹별 운동 기록 조회 |
| weeklyStats | userId (↑) | weekStart (↓) | 사용자별 주간 통계 |
| weeklyStats | groupId (↑) | weekStart (↓) | 그룹별 주간 통계 |

## 🚀 완료 후 확인

인덱스 생성이 완료되면:
- ✅ 운동 기록이 정상적으로 표시됨
- ✅ 대시보드 로딩이 빨라짐
- ✅ 에러 메시지가 사라짐
- ✅ 모든 기능이 정상 작동

**가장 쉬운 방법은 에러 메시지의 파란색 링크를 클릭하는 것입니다!** 🎉
