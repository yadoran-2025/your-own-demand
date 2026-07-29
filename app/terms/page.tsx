import type { Metadata } from "next";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "이용약관 | 수요곡선 활동 시스템",
  description: "수요곡선 활동 시스템 이용 기준 안내",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="teacher-eyebrow">법률 및 운영 안내</p>
        <h1>이용약관</h1>
        <p className="legal-muted">시행일: 2026년 7월 29일</p>

        <section>
          <h2>1. 목적</h2>
          <p>
            이 약관은 수요곡선 활동 시스템을 학교 경제 수업에서 사용하는 데
            필요한 기본 이용 조건을 안내합니다.
          </p>
        </section>

        <section>
          <h2>2. 이용 대상</h2>
          <p>
            서비스는 만 14세 이상인 학생과 교사에게만 제공됩니다. 만 14세
            미만은 수업방에 입장하거나 응답을 제출하면 안 됩니다.
          </p>
        </section>

        <section>
          <h2>3. 학생 이름과 수업용 별명</h2>
          <p>
            학생은 수업 참여 여부 확인을 위해 이름 또는 수업용 별명을 입력하며,
            별명은 교사가 허용한 것을 사용합니다. 입력한 이름 또는 별명은 담당
            교사와 같은 학년·반 응답 학생에게 공개됩니다.
          </p>
        </section>

        <section>
          <h2>4. 데이터 관리</h2>
          <p>
            교사는 수업 종료 후 불필요한 응답을 삭제하고, 학교의 개인정보 처리
            기준과 학운위 심의 요구사항을 확인한 뒤 서비스를 사용해야 합니다.
          </p>
        </section>
      </article>
      <LegalFooter />
    </main>
  );
}
