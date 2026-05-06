import Link from "next/link";
import { ArrowLeft, BarChart3, ClipboardList } from "lucide-react";

export default function TeacherPage() {
  return (
    <main className="app-shell px-4 py-5 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl content-center gap-6">
        <header>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"
            href="/"
          >
            <ArrowLeft size={17} />
            처음으로
          </Link>
          <h1 className="text-3xl font-black md:text-5xl">교사 대시보드</h1>
          <p className="mt-3 max-w-2xl text-[var(--text-muted)]">
            조사 문항을 만드는 화면과 학생 응답 결과를 확인하는 화면을 나누었습니다.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            className="surface block rounded-lg p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
            href="/teacher/setup"
          >
            <ClipboardList className="text-[var(--brand)]" size={34} />
            <h2 className="mt-5 text-2xl font-black">조사 세팅</h2>
            <p className="mt-3 leading-7 text-[var(--text-muted)]">
              조사 제목, 상품, 가격 정책 설명, 가격 구간을 추가하고 수정합니다.
            </p>
          </Link>

          <Link
            className="surface block rounded-lg p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
            href="/teacher/results"
          >
            <BarChart3 className="text-[var(--brand)]" size={34} />
            <h2 className="mt-5 text-2xl font-black">조사 결과 확인</h2>
            <p className="mt-3 leading-7 text-[var(--text-muted)]">
              학생 응답을 수요곡선으로 보고, 학년과 반 기준으로 비교합니다.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}

