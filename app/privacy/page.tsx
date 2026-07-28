import type { Metadata } from "next";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | 수요곡선 활동 시스템",
  description: "수요곡선 활동 시스템의 개인정보 처리 기준 안내",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="teacher-eyebrow">법률 및 운영 안내</p>
        <h1>개인정보 처리방침</h1>
        <p className="legal-muted">시행일: 2026년 7월 28일</p>

        <section>
          <h2>1. 처리 목적</h2>
          <p>
            수요곡선 활동 시스템은 교사가 개설한 수업 방에서 학생 응답을
            수집하고, 반별·전체 수요곡선과 응답 통계를 수업 중 확인하기 위해
            개인정보를 처리합니다.
          </p>
        </section>

        <section>
          <h2>2. 수집 항목</h2>
          <p>
            필수 항목은 학년, 반, 이름 또는 수업용 별명, 가격별 구매 수량,
            제출 시각입니다. 학생 번호는 현재 시스템 내부 호환을 위해 기본값
            1로 저장되며 학생 화면에서 별도로 입력받지 않습니다.
          </p>
          <p>
            학생은 실명 대신 교사가 안내한 수업용 별명을 입력할 수 있습니다.
            교사는 수업 목적에 필요하지 않은 연락처, 주민등록번호, 계정 정보,
            민감정보를 입력하게 해서는 안 됩니다.
          </p>
        </section>

        <section>
          <h2>3. 보유 및 파기</h2>
          <p>
            응답 데이터는 해당 수업 활동 운영과 결과 확인에 필요한 기간 동안만
            보관합니다. 교사는 수업 종료 후 불필요한 응답을 응답 관리 화면에서
            삭제해야 하며, 학교 내부 기준이 없다면 수업 종료 후 30일 이내
            삭제를 기본 보유기간으로 삼습니다.
          </p>
        </section>

        <section>
          <h2>4. 안전성 확보조치</h2>
          <p>
            서비스는 HTTPS 연결을 사용합니다. Cloud Firestore의 직접 클라이언트
            접근은 거부되며, Vercel 서버 API가 수업 방 소유권을 확인합니다.
            운영자는 방 이름과 설문 관리 권한이 외부에 노출되지 않도록 관리해야
            합니다.
          </p>
        </section>

        <section>
          <h2>5. 제3자 제공</h2>
          <p>
            운영자는 법령에 따른 경우를 제외하고 학생 개인정보를 제3자에게
            제공하지 않습니다. 향후 제3자 제공이 필요한 기능을 추가할 때에는
            제공받는 자, 목적, 항목, 보유기간을 별도로 고지하고 필요한 동의를
            받아야 합니다.
          </p>
        </section>

        <section>
          <h2>6. 처리 위탁 및 국외이전</h2>
          <p>
            설문과 응답의 주 저장소는 Firebase 프로젝트 ID{" "}
            <code>inflation-2e38b</code>의 Cloud Firestore이며, 데이터베이스
            위치는 대한민국 서울 리전 <code>asia-northeast3</code>입니다.
          </p>
          <p>
            Google Firebase Authentication은 교사 Google 로그인과 학생 익명
            세션의 식별자를 미국 데이터센터에서 처리합니다. Vercel은 웹사이트를
            호스팅하고 학생 프로필과 응답이 포함된 서버 API 요청을 미국의 주요 처리
            시설 및 계약상 하위 처리자를 통해 처리할 수 있습니다. 따라서 Firestore가
            서울에 있더라도 서비스 전체를 국외이전이 없는 구조로 보지 않습니다.
          </p>
          <p>
            국외 처리는 인증, API 실행, 보안 로그 및 장애 대응을 목적으로 서비스
            이용 중 지속적으로 발생할 수 있습니다. 운영자는 학교 도입 전에 Google과
            Vercel의 최신 처리 국가, 하위 처리자, 보유·삭제 조건을 확인하고,
            개인정보 보호법과 학교·교육청 기준에 따른 고지 또는 동의 절차를
            완료해야 합니다.
          </p>
        </section>

        <section>
          <h2>7. 정보주체 권리</h2>
          <p>
            학생과 보호자는 본인 응답의 열람, 정정, 삭제, 처리정지를 교사 또는
            운영자에게 요청할 수 있습니다. 교사는 요청을 확인한 뒤 응답 관리
            화면에서 해당 응답을 수정하거나 삭제합니다.
          </p>
        </section>

        <section>
          <h2>8. 아동 개인정보</h2>
          <p>
            만 14세 미만 학생의 개인정보를 처리하는 수업에서는 교사가 학교의
            개인정보 처리 기준에 따라 보호자 동의 등 필요한 절차를 먼저
            확인해야 합니다. 이 서비스는 보호자 동의를 자동으로 대신 받지
            않습니다.
          </p>
        </section>

        <section id="contact">
          <h2>9. 개인정보 보호책임자 및 문의</h2>
          <p>
            개인정보 보호책임자는 서비스 운영자(Yadoran)입니다. 개인정보
            열람, 정정, 삭제, 처리정지 요청과 보안 문의는 아래 문의 링크로
            접수합니다.
          </p>
          <p>
            문의 링크:{" "}
            <a href="https://blog.naver.com/yadoransw/224282983636">
              https://blog.naver.com/yadoransw/224282983636
            </a>
          </p>
        </section>
      </article>
      <LegalFooter />
    </main>
  );
}
