# dorms-check 점검 리포트

- 앱: your-own-demand
- 주소: https://yadoran-2025.github.io/your-own-demand/teacher/ 
- 스택: Next.js
- 점검 트랙: security, edzip

> 이 리포트는 dorms-check(코치)의 자체 점검 결과입니다. 최종 인증마크는 도름스 서버가 스스로 다시 검증해 발급하며, 이 리포트의 통과가 마크를 보장하지 않습니다.

## 보안 검토
- 점수: 62/100 (D)
- 마크 자격(critical/high 0): 미충족

### 통과 항목(증빙)
- [v] Strict-Transport-Security — 헤더값: max-age=31556952
- [v] 서버/프레임워크 버전 노출 — x-powered-by 미노출(양호)
- [v] SSL 인증서 유효 — TLS 연결 성공 (TLSv1.3)
- [v] 구버전 TLS 미사용 — TLS 버전 양호: TLSv1.3
- [v] 민감 파일 노출(.env/.git) — 민감 파일(.env/.git) 노출 없음
- [v] 설정 파일 노출 — 설정 파일 비노출
- [v] 소스맵 노출 — 소스맵 참조 없음
- [v] 에러 스택트레이스 노출 — 스택트레이스 노출 없음
- [v] Mixed Content — mixed content 없음
- [v] 페이지 제목 — <title> 있음
- [v] 설명 메타 — 설명 메타
- [v] 모바일 viewport — viewport 메타
- [v] 응답 속도 — 응답 시간 340ms
- [v] 문서 크기 — 문서 크기 9KB
- [v] 압축 — 압축: gzip
- [v] 연락처 — 연락처/문의 정보 있음
- [v] 익명 접근 차단(Supabase RLS) — 익명 SELECT로 행이 새는 테이블 없음(RLS 양호)
- [v] 미인증 API 접근 — 미인증 호출로 데이터를 반환하는 API 후보 없음
- [v] 하드코딩 시크릿 — 하드코딩 시크릿 미검출
- [v] 클라이언트 시크릿 노출 — 클라 시크릿 노출 미검출
- [v] 헤더 설정 위치 — public/_headers:1-13 and vercel.json:1-29 configure CSP, frame-ancestors/X-Frame-Options, nosniff, Referrer-Policy, and Permissions-Policy for hosts that support custom headers.
- [v] 위험 코드 패턴(검토 후보) — 위험 코드 패턴 미검출

### 아직 고쳐야 할 항목
#### [high] Content-Security-Policy
- 무엇: 외부에서 내 페이지에 악성 스크립트를 끼워넣는 공격(XSS)을 막는 기본 규칙이 없어요.
- 지금 상태: 누락: content-security-policy
- AI에게 이렇게 시켜주세요: `내 Next.js 앱의 모든 응답에 Content-Security-Policy 헤더를 넣어줘. Next.js면 middleware.ts에서 설정하고 최소한 default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' 를 포함해줘. 인라인 스크립트가 필요하면 nonce 방식으로 허용해줘.`

#### [high] HTTPS 강제(HTTP→HTTPS 리다이렉트)
- 무엇: http로 들어와도 암호화된 https로 자동 전환되지 않아, 중간에서 내용이 새거나 조작될 수 있어요.
- 지금 상태: HTTP 요청이 HTTPS로 강제되지 않음 (HTTP 404)
- AI에게 이렇게 시켜주세요: `Next.js 앱에서 http 요청을 https 로 강제 리다이렉트하도록 설정해줘.`

#### [high] 개인정보처리방침
- 무엇: 개인정보를 다루는 서비스는 개인정보처리방침을 반드시 공개해야 해요(개인정보 보호법 제30조).
- 지금 상태: 개인정보처리방침 페이지/링크 없음
- AI에게 이렇게 시켜주세요: `개인정보처리방침 페이지(/privacy)를 만들어 링크를 노출해줘. dorms-check templates/privacy-policy.ko.md 를 골격으로 실제 수집 항목에 맞게 채워줘.`

#### [medium] 클릭재킹 방어(X-Frame-Options / frame-ancestors)
- 무엇: 내 화면을 남의 사이트가 몰래 안에 띄워 클릭을 가로채는 공격을 막는 설정이 없어요.
- 지금 상태: 누락: x-frame-options
- AI에게 이렇게 시켜주세요: `Next.js 앱에 X-Frame-Options: DENY 헤더(또는 CSP frame-ancestors 'none')를 추가해줘.`

#### [low] X-Content-Type-Options: nosniff
- 무엇: 브라우저가 파일 종류를 멋대로 추측해 생기는 공격을 막는 설정이 없어요.
- 지금 상태: 누락: x-content-type-options
- AI에게 이렇게 시켜주세요: `Next.js 앱 응답에 X-Content-Type-Options: nosniff 헤더를 추가해줘.`

#### [low] Referrer-Policy
- 무엇: 다른 사이트로 이동할 때 내 주소 정보가 과하게 새는 걸 막는 설정이 없어요.
- 지금 상태: 누락: referrer-policy
- AI에게 이렇게 시켜주세요: `Next.js 앱에 Referrer-Policy: strict-origin-when-cross-origin 헤더를 추가해줘.`

#### [low] Permissions-Policy
- 무엇: 카메라·위치 같은 브라우저 권한 사용을 제한하는 설정이 없어요.
- 지금 상태: 누락: permissions-policy
- AI에게 이렇게 시켜주세요: `Next.js 앱에 필요한 기능만 허용하는 Permissions-Policy 헤더를 추가해줘(예: camera=(), geolocation=()).`

#### [info] Open Graph
- 무엇: 링크 공유 미리보기(OG) 태그가 없어요.
- 지금 상태: Open Graph 태그
- AI에게 이렇게 시켜주세요: `og:title/og:description/og:image 메타를 넣어줘.`

### 참고(검토 권장, 마크 게이트 아님)
- CORS 설정: 와일드카드(*) 허용 — 공개 API면 무방, 인증 API면 위험
- canonical: canonical 링크
- 이용약관: 이용약관 페이지/링크 없음

## 학운위 심사 준비(에듀집 필수기준)
- 준비 상태: 미충족
- 개인정보처리방침 공개: 없음

> "학운위 심사 준비 완료"는 학교 심의에 낼 서류가 갖춰졌다는 뜻이며, 심의 통과를 보장하지 않습니다. 심의와 최종 결정은 각 학교가 합니다.
