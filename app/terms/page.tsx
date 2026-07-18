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
        <p className="legal-muted">시행일: 2026년 7월 18일</p>

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
            서비스는 교사가 수업 활동을 개설하고 학생이 해당 수업 방에 참여해
            응답을 제출하는 용도로 사용합니다. 교사는 방 이름과 링크를 수업
            참여자에게만 공유해야 합니다.
          </p>
        </section>

        <section>
          <h2>3. 개인정보 입력 제한</h2>
          <p>
            학생은 교사가 안내한 이름 또는 수업용 별명만 입력해야 하며, 연락처,
            주소, 계정 비밀번호, 민감정보 등 수업 목적과 무관한 정보를 입력하면
            안 됩니다.
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
