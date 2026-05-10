"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  LineChart,
  QrCode,
  Route,
  Users,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import { TeacherPageHeader, TeacherShell } from "@/components/TeacherShell";
import {
  buildStudentPath,
  TEACHER_ROOM_KEY,
  useStoredRoomName,
} from "@/lib/roomName";

type GuideItem = {
  id: string;
  icon: ReactNode;
  kicker: string;
  title: string;
  summary: string;
  body: string;
  example: string;
  teacherUse: string;
};

const guideItems: GuideItem[] = [
  {
    id: "room",
    icon: <Users size={22} />,
    kicker: "진입 구조",
    title: "교사별 진입코드",
    summary: "방 이름으로 교사별 설문 공간을 나눕니다.",
    body: "교사가 처음 입력하는 방 이름이 설문을 나누는 기준입니다. 저장된 설문은 이 방 이름과 함께 묶이고, 학생 링크도 같은 방 이름을 포함하므로 다른 교사의 설문과 섞이지 않습니다.",
    example: "예: 3학년경제A 방에서 만든 설문은 같은 방으로 입장한 학생에게만 보입니다.",
    teacherUse: "수업 전 칠판이나 학급 LMS에 방 이름을 안내하면 학생들이 같은 설문 공간으로 들어옵니다.",
  },
  {
    id: "setup",
    icon: <ClipboardList size={22} />,
    kicker: "수업 설계",
    title: "설문 만들기",
    summary: "상황, 가격 구성, 학급별 예산을 설계합니다.",
    body: "교사는 설문 제목, 여러 개의 상황, 상황별 가격 구성, 학급별 예산을 입력합니다. 학생은 각 상황을 독립적인 소비 선택으로 보고 구매 수량을 제출합니다.",
    example: "예: 체육대회 후 음료 상황에 소형 캔, 중형 페트병, 대형 페트병 가격을 둡니다.",
    teacherUse: "가격대는 너무 촘촘하게 두기보다 학생들이 실제로 고민할 만한 구간으로 잡는 것이 좋습니다.",
  },
  {
    id: "collect",
    icon: <QrCode size={22} />,
    kicker: "응답 수집",
    title: "학생 데이터 수집",
    summary: "학생 정보와 가격별 구매량을 함께 저장합니다.",
    body: "학생은 QR 또는 링크로 들어와 학년, 반, 이름을 입력하고 배정된 가격 조건마다 구매 수량을 답합니다. 응답에는 학생 정보와 가격별 구매량, 제출 시각이 함께 저장됩니다.",
    example: "수집 데이터: 학년, 반, 이름, 상황, 배정 가격, 구매 수량, 제출 시각.",
    teacherUse: "응답 전에 학생들에게 정답을 맞히는 활동이 아니라 자기 선택을 표현하는 활동이라고 안내하면 데이터가 더 자연스럽습니다.",
  },
  {
    id: "assign",
    icon: <WalletCards size={22} />,
    kicker: "개별 제시",
    title: "개별 학생에게 보이는 조건",
    summary: "학생마다 각 상황의 가격 조건 하나만 봅니다.",
    body: "학생마다 각 상황에서 하나의 가격 조건만 보입니다. 앱은 이미 쌓인 응답 수를 보고 가격 조건이 고르게 배정되도록 선택하며, 학급 예산이 있으면 예산 초과 제출을 막습니다.",
    example: "같은 빵 상황이라도 어떤 학생은 2,000원 조건을, 다른 학생은 8,000원 조건을 봅니다.",
    teacherUse: "학생들이 서로 다른 가격을 봤다는 점은 결과 분석 단계에서 수요곡선이 만들어지는 원리로 연결할 수 있습니다.",
  },
  {
    id: "curve",
    icon: <LineChart size={22} />,
    kicker: "결과 분석",
    title: "결과 수합과 수요곡선",
    summary: "가격별 평균 구매량으로 수요곡선을 만듭니다.",
    body: "결과 화면은 같은 상황의 가격별 응답을 모아 평균 구매량을 계산합니다. 가격은 가로축, 평균 구매량은 세로축이 되어 수요곡선으로 나타납니다.",
    example: "가격이 올라갈수록 평균 구매량이 줄어드는지 바로 확인할 수 있습니다.",
    teacherUse: "가격과 수요량의 관계가 교과서 그래프가 아니라 우리 반 데이터에서 나온다는 점을 강조할 수 있습니다.",
  },
  {
    id: "compare",
    icon: <BarChart3 size={22} />,
    kicker: "토론 확장",
    title: "수요곡선 비교의 교육적 의도",
    summary: "반별 곡선과 전체 곡선을 비교해 토론합니다.",
    body: "반별 곡선과 전체 곡선을 비교하면 같은 가격에도 집단별 선호와 예산 제약이 다르게 나타나는 지점을 토론할 수 있습니다. 상황별 곡선을 비교하면 필수재와 선택재, 가격 탄력성, 대체 관계를 수업 질문으로 연결할 수 있습니다.",
    example: "질문: 왜 이 반은 같은 가격에서 전체 평균보다 더 많이 사려고 했을까?",
    teacherUse: "결과가 예상과 다르더라도 실패한 데이터가 아니라 선호, 맥락, 표본 차이를 토론할 좋은 출발점입니다.",
  },
];

const flowSteps = [
  { id: "room", label: "교사 방 열기" },
  { id: "setup", label: "설문 세팅" },
  { id: "collect", label: "학생 QR 입장" },
  { id: "assign", label: "응답 제출" },
  { id: "curve", label: "결과 비교" },
];

const discussionPrompts = [
  {
    question: "가격이 올랐는데도 구매량이 크게 줄지 않은 상황은 무엇인가요?",
    answer:
      "이런 상황은 가격 비탄력적 수요를 보여줍니다. 필수재에 가까운 상품일수록 가격이 올라도 구매량이 유지되는 경향이 있습니다. 대체재가 적거나 상황 설명이 긴박할수록 이 현상이 더 뚜렷하게 나타납니다. 수요곡선의 기울기가 가파른 상황이 어디인지 학생들과 같이 찾아보세요.",
  },
  {
    question: "우리 반 수요곡선과 전체 수요곡선이 가장 달라진 가격대는 어디인가요?",
    answer:
      "반별 곡선과 전체 곡선의 차이는 집단별 선호, 예산, 경험이 다르다는 것을 보여줍니다. 특정 가격대에서 큰 차이가 나타나면 그 가격이 그 집단에게 심리적 임계점이었음을 의미할 수 있습니다. 결과가 예상과 달라도 실패한 데이터가 아니라 선호와 맥락의 차이를 토론할 출발점으로 활용하세요.",
  },
  {
    question: "예산 제한이 있는 학급과 없는 학급의 응답은 어떻게 달라질까요?",
    answer:
      "예산 제한이 있으면 학생들이 상황 간 우선순위를 정해야 하므로 구매량 선택이 달라집니다. 제한이 없는 경우와 비교하면 예산 제약이 실제 구매 결정에 미치는 영향을 직접 관찰할 수 있습니다. 이를 통해 소득 효과와 예산선 개념을 수업 데이터로 연결할 수 있습니다.",
  },
  {
    question: "같은 상품이라도 상황 설명이 바뀌면 수요곡선의 기울기는 어떻게 달라질까요?",
    answer:
      "같은 음료라도 '체육대회 후 목이 마를 때'와 '일상적인 상황'은 소비자의 심리적 긴급함을 다르게 만듭니다. 동일한 가격에서도 구매량이 크게 달라질 수 있어, 수요가 상품 자체뿐 아니라 맥락에 의해서도 결정됨을 보여줍니다. 상황 설명을 바꿔 재실험하면 수요의 결정 요인을 비교할 수 있습니다.",
  },
];

export default function TeacherGuidePage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const [selectedId, setSelectedId] = useState(guideItems[0].id);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const selectedItem =
    guideItems.find((item) => item.id === selectedId) ?? guideItems[0];

  function togglePrompt(question: string) {
    setSelectedPrompt((prev) => (prev === question ? null : question));
  }

  return (
    <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름으로 설문을 만들고 결과를 확인하는 흐름을 볼 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
    >
      <TeacherShell active="guide" roomName={roomName}>
        <div className="guide-page-v3">
          <TeacherPageHeader
            actions={<RoomBadge roomName={roomName} onReset={() => setRoomName("")} />}
            description="방 이름으로 설문을 나누고, 학생 응답을 모아 수요곡선으로 비교하는 전체 흐름을 확인합니다."
            eyebrow="대시보드 / 활용 안내"
            title="수업 활용 안내"
          />

          <section className="guide-v3-hero">
            <div className="guide-v3-hero-copy">
              <span className="guide-v3-kicker">수업 전 점검</span>
              <h2>학생의 실제 선택을 가격별로 모아 수요곡선을 만드는 교실 실험입니다.</h2>
              <p>
                선생님은 상황과 가격 조건을 설계하고, 학생은 자기에게 제시된 가격에서
                얼마나 구매할지 답합니다. 아래 항목을 클릭하면 필요한 설명만 확인할 수 있습니다.
              </p>
            </div>
            <aside className="guide-v3-quick">
              <h3>바로 이동</h3>
              <p>수업 중에는 이 세 가지 동선만 기억하면 됩니다.</p>
              <div className="guide-v3-actions">
                <Link className="guide-v3-button primary" href="/teacher/setup">
                  설문 세팅
                </Link>
                <Link
                  className="guide-v3-button"
                  href={buildStudentPath(roomName)}
                  target="_blank"
                >
                  학생 화면 열기
                </Link>
                <Link className="guide-v3-button" href="/teacher/results">
                  결과 확인
                </Link>
              </div>
            </aside>
          </section>

          <section className="guide-v3-discussion">
            <div className="guide-v3-section-head">
              <h2>수업 질문으로 연결하기</h2>
              <Route size={18} />
            </div>
            <div className="guide-v3-prompts">
              {discussionPrompts.map(({ question, answer }) => (
                <div className="guide-v3-prompt-wrap" key={question}>
                  <button
                    className="guide-v3-prompt"
                    data-active={selectedPrompt === question}
                    onClick={() => togglePrompt(question)}
                    type="button"
                  >
                    <span>{question}</span>
                    <ChevronRight
                      className="guide-v3-prompt-chevron"
                      size={15}
                    />
                  </button>
                  {selectedPrompt === question && (
                    <div className="guide-v3-prompt-answer">
                      <p>{answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="guide-v3-flow" aria-labelledby="guide-flow-title">
            <div className="guide-v3-section-head">
              <h2 id="guide-flow-title">수업 흐름 한눈에 보기</h2>
              <span>5단계 운영</span>
            </div>
            <div className="guide-v3-flow-grid">
              {flowSteps.map((step, index) => (
                <button
                  className="guide-v3-flow-step"
                  data-active={selectedId === step.id}
                  key={step.id}
                  onClick={() => setSelectedId(step.id)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <strong>{step.label}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="guide-v3-workspace">
            <nav className="guide-v3-side" aria-label="활용 안내 항목">
              {guideItems.map((item) => (
                <button
                  className="guide-v3-side-item"
                  data-active={selectedId === item.id}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  type="button"
                >
                  <span className="guide-v3-icon">{item.icon}</span>
                  <span>
                    <small>{item.kicker}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </nav>

            <article className="guide-v3-detail" aria-live="polite">
              <div className="guide-v3-detail-head">
                <span className="guide-v3-detail-icon">{selectedItem.icon}</span>
                <div>
                  <p>{selectedItem.kicker}</p>
                  <h2>{selectedItem.title}</h2>
                </div>
              </div>
              <p className="guide-v3-summary">{selectedItem.summary}</p>
              <div className="guide-v3-detail-body">
                <section>
                  <h3>핵심 설명</h3>
                  <p>{selectedItem.body}</p>
                </section>
                <section>
                  <h3>수업에서 이렇게 보입니다</h3>
                  <p>{selectedItem.example}</p>
                </section>
                <section>
                  <h3>선생님 활용 포인트</h3>
                  <p>{selectedItem.teacherUse}</p>
                </section>
              </div>
            </article>
          </section>
        </div>
      </TeacherShell>
    </RoomGate>
  );
}
