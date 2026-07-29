# dorms-check 보안·에듀집 사전 점검 기록

- 점검 시각(UTC): 2026-07-29T07:42:37.558Z
- 앱: 수요곡선 활동 시스템
- 점검 URL: `https://inflation-classroom-8gwz6znz4-yadorans-projects.vercel.app`
- 개인정보 처리 분류: `D` — 학생 개인정보·학습내용을 처리하고, 학교 기기 밖의 Firebase Authentication 및 Vercel 처리 경로가 있으며, 식별자가 항상 마스킹되거나 학교 기기에만 남지는 않음

## 실행 기록

1. `npx -y dorms-check@latest detect`는 npm `E404`를 반환했다.
2. 이미 승인된 대체 경로 `npx -y github:shinnanchanguk/dorms-check`로 `init`, `scan`, `judge`, 재 `scan`, `status`를 실행했다.
3. `judge`는 근거가 있는 10개 항목을 수용했고 거부한 항목은 없었다. `code.endpoint.unauth`는 현재 `app/api` 라우트와 인증 경계를 검토해 판정했다.

## 근거가 있는 처리·보호 조치

- 직접 Cloud Firestore 접근은 [firestore.rules](/Users/a/your-own-demand/firestore.rules:1)에서 전면 거부된다.
- API는 [lib/server/auth.ts](/Users/a/your-own-demand/lib/server/auth.ts:5)에서 Firebase ID 토큰을 요구하며, 교사 작업은 익명 계정을 거부한다([17행](/Users/a/your-own-demand/lib/server/auth.ts:17)).
- 비교 대상 학생 응답은 본인 응답 이외에 이름·번호·응답 식별자가 제거된다([lib/server/responses.ts](/Users/a/your-own-demand/lib/server/responses.ts:138)).
- 개인정보처리방침은 주 저장소의 서울 Firestore와 별개로 Firebase Authentication·Vercel의 미국 처리 가능성을 구분해 고지한다([app/privacy/page.tsx](/Users/a/your-own-demand/app/privacy/page.tsx:71)).

## 스캐너 결과와 해석

도구의 마지막 `scan`은 보안 `94/100 (A)`, 보안 마크 자격 `충족`, 학운위 준비 `충족`을 출력했다. 단, 이 Preview에는 Vercel 배포 보호가 켜져 있어 일반 스캐너가 앱 대신 Vercel 보호 응답을 읽었다. 따라서 다음 5건은 도구상 `남은 항목`이지만, 실제 앱 응답에 대한 미확정 항목으로 보존한다.

| 도구 항목 | 도구 상태 | 인증된 Preview 재확인 | 결론 |
| --- | --- | --- | --- |
| Permissions-Policy | low | `npx -y vercel@latest curl <preview> -I`에서 `camera=(), microphone=(), geolocation=(), payment=(), usb=()` 확인 | 보호 페이지의 오탐으로 보임 |
| 쿠키 HttpOnly/Secure | medium | Firebase ID-token 기반 API 인증이며 앱 세션 쿠키를 이 점검에서 독립적으로 관찰하지 못함 | 미확정: 실제 앱 쿠키가 생기는 경로가 추가되면 재점검 필요 |
| title | info | 인증된 `/teacher` 응답에서 `수요곡선 활동 시스템` 확인 | 보호 페이지의 오탐으로 보임 |
| description | info | 인증된 `/teacher` 응답에서 설명 메타 확인 | 보호 페이지의 오탐으로 보임 |
| Open Graph | info | 인증된 `/teacher` 응답에서 `og:title`, `og:description` 확인 | 보호 페이지의 오탐으로 보임 |

인증된 Preview의 `/api/surveys?room=test`는 인증 헤더 없이 정확히 `{"error":"로그인이 필요합니다."}`를 반환했다. 이 점검은 비밀값·UID·학생 데이터를 기록하지 않았다.

## 생산 배포 판단

이 결과는 **로컬 사전 준비 기록**이며 dorms.school의 최종 독립 인증이 아니다. 도구 상태상 보안/에듀집은 충족으로 표시되지만, 도구의 남은 항목은 5건이고 쿠키 플래그는 이 환경에서 확정할 수 없다. 따라서 이 Task 7은 코드·법률 문구·호스팅 설정·배포를 변경하지 않았고, Production 배포를 승인하거나 최종 인증을 신청하지 않는다. 그런 변경이나 배포는 별도 명시 승인을 받은 뒤 인증된 실제 앱 응답으로 재점검해야 한다.
