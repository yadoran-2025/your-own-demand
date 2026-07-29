# dorms-check 점검 리포트

- 앱: 수요곡선 활동 시스템
- 주소: https://inflation-classroom.vercel.app 
- 스택: Next.js,Firebase,Vercel
- 점검 트랙: security, edzip

> 이 리포트는 dorms-check(코치)의 자체 점검 결과입니다. 최종 인증마크는 도름스 서버가 스스로 다시 검증해 발급하며, 이 리포트의 통과가 마크를 보장하지 않습니다.

## 보안 검토
- 점수: 100/100 (A+)
- 마크 자격(critical/high 0): 충족

### 통과 항목(증빙)
- [v] Content-Security-Policy — 헤더값: default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net data:; img-src 'self' data: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com; frame-src 'self' https://inflation-2e38b.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
- [v] Strict-Transport-Security — 헤더값: max-age=63072000; includeSubDomains; preload
- [v] 클릭재킹 방어(X-Frame-Options / frame-ancestors) — 헤더값: DENY
- [v] X-Content-Type-Options: nosniff — 헤더값: nosniff
- [v] Referrer-Policy — 헤더값: strict-origin-when-cross-origin
- [v] Permissions-Policy — 헤더값: camera=(), microphone=(), geolocation=(), payment=(), usb=()
- [v] 서버/프레임워크 버전 노출 — x-powered-by 미노출(양호)
- [v] HTTPS 강제(HTTP→HTTPS 리다이렉트) — HTTP 요청이 HTTPS로 리다이렉트됨 (HTTP 308 -> https://inflation-classroom.vercel.app/)
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
- [v] Open Graph — Open Graph 태그
- [v] canonical — canonical 링크
- [v] 문서 크기 — 문서 크기 11KB
- [v] 압축 — 압축: br
- [v] 개인정보처리방침 — 개인정보처리방침 발견(link: /privacy/)
- [v] 이용약관 — 이용약관 발견(link: /terms/)
- [v] 연락처 — 연락처/문의 정보 있음
- [v] 미인증 API 접근 — 학생·교사 데이터의 네 핵심 API는 application data 반환 전 Firebase 토큰을 요구한다(app/api/surveys/route.ts:8-17, app/api/responses/route.ts:8-19, app/api/rooms/ensure/route.ts:5-15, app/api/assignments/reserve/route.ts:12-23, lib/server/auth.ts:5-14). 별도 파기 cron은 bearer CRON_SECRET을 요구한다(app/api/cron/purge-student-data/route.ts:6-13). 기존 라이브 프리플라이트 증빙은 미인증 /api/surveys 요청의 HTTP 401을 기록한다(.dorms-check/evidence/cutover/PREFLIGHT.md).
- [v] 하드코딩 시크릿 — 하드코딩 시크릿 미검출
- [v] 클라이언트 시크릿 노출 — 클라 시크릿 노출 미검출
- [v] 헤더 설정 위치 — public/_headers:1-13 and vercel.json:1-29 configure CSP, frame-ancestors/X-Frame-Options, nosniff, Referrer-Policy, and Permissions-Policy for hosts that support custom headers.
- [v] 위험 코드 패턴(검토 후보) — 위험 코드 패턴 미검출

### 참고(검토 권장, 마크 게이트 아님)
- CORS 설정: 와일드카드(*) 허용 — 공개 API면 무방, 인증 API면 위험
- 응답 속도: 응답 시간 1241ms

## 학운위 심사 준비(에듀집 필수기준)
- 준비 상태: 충족(제출 서류 준비됨)
- 개인정보처리방침 공개: 있음

> "학운위 심사 준비 완료"는 학교 심의에 낼 서류가 갖춰졌다는 뜻이며, 심의 통과를 보장하지 않습니다. 심의와 최종 결정은 각 학교가 합니다.
