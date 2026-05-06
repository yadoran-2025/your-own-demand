# 수요곡선 활동 시스템

고등학교 경제 수업에서 상품별 가격 구간을 만들고, 학생 응답을 수요곡선으로 시각화하는 Next.js 앱입니다.

## 주요 기능

- 교사: 조사 제목, 상품, 가격 설명, 가격 구간을 설정
- 학생: 학년, 반, 번호, 이름을 입력하고 가격별 구매량 제출
- 차트: 우리 반 평균과 전체 평균 수요곡선 비교
- 응답 분포: 가격별 0개, 1개, 2개, 3개, 4개 이상 응답 분포 확인
- 필터: 전체, 학년, 반 기준으로 결과 분석
- 저장소: Supabase가 없으면 localStorage 데모 모드로 동작

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Supabase PostgreSQL
- BOOONG Design System CSS

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

Supabase 환경변수가 없으면 localStorage 데모 모드로 동작합니다. 실제 반별/전체 실시간 데이터 저장에는 Supabase 설정이 필요합니다.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. Project Settings > API에서 URL과 anon key를 복사합니다.
4. `.env.local`에 값을 넣습니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

현재 MVP는 교실 활동용 단순 공개 정책을 사용합니다. 실제 배포에서는 교사용 비밀번호, 교사 계정, RLS 정책 분리를 추가하는 것을 권장합니다.

## 데이터베이스 구조

- `surveys`: 조사 제목
- `products`: 조사에 포함된 상품
- `price_points`: 상품별 가격 구간과 설명
- `responses`: 학생 기본 정보와 응답 묶음
- `response_items`: 가격별 구매량

상품 또는 가격 구조를 수정해 저장하면 기존 응답은 새 구조와 충돌하지 않도록 해당 조사 응답을 초기화합니다. 수업 중에는 응답을 받기 전에 구조를 확정하는 흐름을 권장합니다.

## 검증 명령

```bash
npm run typecheck
npm run lint
npm run build
```
