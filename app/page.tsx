import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  GraduationCap,
  LineChart,
  Settings2,
} from "lucide-react";

export default function Home() {
  const classroomFlow = [
    {
      title: "교사가 상품과 가격표를 준비합니다",
      body: "수업에 맞는 상품, 가격 구간, 가격 설명을 먼저 정리합니다.",
    },
    {
      title: "학생이 가격별 구매량을 제출합니다",
      body: "각 가격에서 사고 싶은 개수를 입력하면 응답이 바로 모입니다.",
    },
    {
      title: "우리 반의 수요곡선을 비교합니다",
      body: "반 평균과 전체 평균을 함께 보며 가격 변화에 따른 선택을 읽습니다.",
    },
  ];

  return (
    <main className="app-shell px-5 py-6 md:px-10 md:py-8">
      <section className="mx-auto grid min-h-[calc(100dvh-9rem)] max-w-6xl content-center gap-8 pb-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-[var(--brand)]">
            <BarChart3 size={18} />
            경제학 수요곡선 활동
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              가격이 바뀔 때 우리 반의 선택을 수요곡선으로 확인해요
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
              수업 중이라면 내 역할에 맞는 화면으로 바로 들어가세요. 학생은
              응답을 제출하고, 교사는 조사를 준비하거나 결과를 확인할 수
              있습니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
            <Link className="primary-button" href="/student">
              <GraduationCap size={20} />
              학생 응답하기
            </Link>
            <Link className="secondary-button" href="/teacher/setup">
              <Settings2 size={20} />
              조사 세팅
            </Link>
            <Link className="secondary-button" href="/teacher/results">
              <LineChart size={20} />
              결과 확인
            </Link>
          </div>
        </div>

        <div className="surface rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
            <ClipboardList className="text-[var(--brand)]" size={28} />
            <div>
              <h2 className="text-xl font-black">수업 흐름 미리보기</h2>
              <p className="mt-1 text-sm font-bold text-[var(--text-muted)]">
                준비부터 비교까지 한 화면 흐름으로 이어집니다.
              </p>
            </div>
          </div>
          <ol className="mt-5 grid gap-5">
            {classroomFlow.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-soft)] text-sm font-black text-[var(--brand)]">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black">{step.title}</h3>
                  <p className="mt-1 leading-7 text-[var(--text-muted)]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-[var(--border)] py-7">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["학생", "가격별 구매량을 빠르게 입력"],
            ["교사", "조사 세팅과 결과 확인을 분리"],
            ["차트", "가격별 응답 분포와 평균 비교"],
          ].map(([title, body]) => (
            <div key={title} className="min-h-24 rounded-lg bg-[var(--bg)] p-4">
              <h2 className="text-sm font-black text-[var(--brand)]">{title}</h2>
              <p className="mt-2 font-bold leading-7">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
