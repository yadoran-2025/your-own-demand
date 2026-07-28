# 수요곡선 활동 시스템

고등학교 경제 수업에서 가격 구간별 학생 응답을 수요곡선으로 시각화하는 Next.js 앱입니다. Vercel이 웹사이트와 서버 API를 실행하고, Firebase Authentication과 Cloud Firestore(프로젝트 ID `inflation-2e38b`)가 인증과 데이터를 처리합니다.

## 로컬 설정

```bash
npm install
cp .env.example .env.local
```

터미널 1에서 Firestore Emulator를 실행합니다.

```bash
npx firebase-tools emulators:start --only firestore
```

터미널 2에서 개발 서버가 Emulator를 사용하도록 설정하고 실행합니다.

```bash
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run dev
```

그 뒤 `http://localhost:3000`을 엽니다. Firebase Emulator는 Java가 필요합니다. 현재 작업 환경에는 Java 런타임이 PATH에 없어 `npm run test:firebase`를 실행하려면 Java를 설치하거나 PATH를 설정해야 합니다. `npm run test:firebase`는 `firebase emulators:exec`가 자식 프로세스에 Emulator host를 주입하므로 안전합니다.

`.env.example`의 모든 키에 각 환경의 값을 넣습니다. `FIREBASE_PRIVATE_KEY`와 서비스 계정 자격 증명은 절대 저장소에 커밋하지 않습니다. 로컬 Emulator 작업에서 production Admin SDK credentials와 설정되지 않은 `FIRESTORE_EMULATOR_HOST`를 함께 사용하지 마세요. Firebase 환경변수가 없으면 앱은 브라우저 localStorage 데모 모드로 동작합니다.

## Firebase Console 설정

1. 표시 이름 `inflation`, 프로젝트 ID `inflation-2e38b`를 선택합니다.
2. Firestore를 활성화합니다.
3. Authentication 제공업체 `Anonymous`와 `Google`을 활성화합니다.
4. Authentication authorized domains에 Vercel Production/Preview 도메인을 추가합니다.
5. Vercel Admin SDK 접근용 최소 권한 서비스 계정을 만듭니다.
6. `.env.example`의 모든 키를 Vercel Production과 Preview에 추가합니다.

Cloud Firestore 보안 규칙은 클라이언트의 직접 읽기·쓰기를 거부합니다. 서버 API는 Firebase 토큰을 검증하고 수업 방 소유권을 확인합니다.

## Vercel 배포

Vercel에서 이 저장소를 연결하고 Production 및 Preview 환경 변수에 `.env.example`의 모든 키를 설정합니다. Firebase Authentication authorized domains에는 배포된 Production 도메인과 Vercel Preview 도메인을 모두 등록합니다. 서비스 계정은 필요한 Admin SDK 권한만 부여합니다.

Firestore 서울 리전은 주 데이터 저장 위치를 국내로 제한하지만, Firebase Authentication과 Vercel API 처리까지 국내화하지 않으므로 개인정보 국외이전 검토를 생략할 근거가 되지 않습니다.

## 검증

```bash
npm test
npm run test:firebase
npm run audit:regression
npm run typecheck
npm run lint
npm run build
```
