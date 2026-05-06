import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  GraduationCap,
  LineChart,
  MousePointerClick,
  Settings2,
} from "lucide-react";
import { LandingStatusPanel } from "@/components/LandingStatusPanel";

export default function Home() {
  const guideCards = [
    {
      title: "학생",
      body: "학년, 반, 번호를 입력하고 가격별 구매량을 제출합니다.",
      icon: GraduationCap,
    },
    {
      title: "교사",
      body: "상품과 가격표를 만들고 수업 전에 조사 구조를 확정합니다.",
      icon: ClipboardList,
    },
    {
      title: "결과",
      body: "우리 반 평균과 전체 평균을 비교하며 수요곡선을 읽습니다.",
      icon: LineChart,
    },
  ];

  return (
    <main className="app-shell landing-page">
      <section className="landing-hero mx-auto grid max-w-7xl gap-8 px-5 py-6 md:px-10 md:py-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.98fr)]">
        <div className="flex min-h-[calc(100dvh-11rem)] flex-col justify-center gap-7 py-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-black text-[var(--brand)]">
            <BarChart3 size={18} />
            경제학 수요곡선 활동
          </div>

          <div className="grid gap-4">
            <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              수업을 시작할 준비가 되면, 내 역할을 고르세요
            </h1>
            <p className="max-w-2xl text-lg font-bold leading-8 text-[var(--text-muted)]">
              가격이 바뀔 때 학생들의 선택이 어떻게 움직이는지 바로 모으고,
              우리 반의 수요곡선을 함께 확인합니다.
            </p>
          </div>

          <div className="grid gap-3">
            <Link className="launch-card launch-card--student" href="/student">
              <span className="launch-card__icon">
                <GraduationCap size={30} />
              </span>
              <span className="min-w-0">
                <strong>학생 응답 시작</strong>
                <small>가격별로 내가 살 개수를 입력합니다</small>
              </span>
              <ArrowRight className="launch-card__arrow" size={24} />
            </Link>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link className="launch-card launch-card--teacher" href="/teacher/setup">
                <span className="launch-card__icon">
                  <Settings2 size={24} />
                </span>
                <span className="min-w-0">
                  <strong>조사 만들기</strong>
                  <small>상품과 가격표 준비</small>
                </span>
              </Link>
              <Link className="launch-card launch-card--teacher" href="/teacher/results">
                <span className="launch-card__icon">
                  <LineChart size={24} />
                </span>
                <span className="min-w-0">
                  <strong>결과 보기</strong>
                  <small>반 평균과 전체 평균 비교</small>
                </span>
              </Link>
            </div>
          </div>

          <p className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)]">
            <MousePointerClick size={17} />
            학생에게는 첫 번째 버튼만 안내하면 충분합니다.
          </p>
        </div>

        <LandingStatusPanel />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 md:px-10">
        <div className="grid gap-4 border-t border-[var(--border)] pt-6 md:grid-cols-3">
          {guideCards.map(({ title, body, icon: Icon }) => (
            <article className="landing-guide" key={title}>
              <Icon className="text-[var(--brand)]" size={24} />
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
