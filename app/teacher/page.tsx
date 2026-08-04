"use client";

import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  QrCode,
  Radio,
  Settings2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TeacherAuthGate } from "@/components/TeacherAuthGate";
import { useAuth } from "@/components/AuthProvider";
import { RoomGate } from "@/components/RoomGate";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import {
  ensureRoomHasDefaultSurveys,
  fetchResponses,
  hasRemoteDatabase,
} from "@/lib/data";
import {
  buildStudentPath,
  TEACHER_ROOM_KEY,
  useStoredRoomName,
} from "@/lib/roomName";
import { canAccessTeacherData } from "@/lib/teacher-access";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";
import type { StudentResponse, Survey } from "@/lib/types";

const ERROR_REPORT_URL =
  "https://blog.naver.com/yadoransw/224282983636";

function formatRelativeTime(value: string) {
  const created = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - created) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${Math.round(diffHours / 24)}일 전`;
}

export default function TeacherPage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const { ready: authReady, isTeacher, demoMode } = useAuth();
  const { workspace } = useTeacherWorkspace();
  const canUseTeacherData = canAccessTeacherData({
    ready: authReady,
    isTeacher,
    demoMode,
    roomName,
  });
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [studentUrl, setStudentUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const activeSurvey = surveys.find((survey) => survey.id === workspace.selectedLessonId) ?? surveys[0];

  const loadDashboard = useCallback(async () => {
    if (!canUseTeacherData) return;
    if (!roomName) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      setSurveys(await ensureRoomHasDefaultSurveys(roomName));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "대시보드를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [canUseTeacherData, roomName]);

  useEffect(() => {
    if (canUseTeacherData && ready && roomName) {
      void loadDashboard();
    }
  }, [canUseTeacherData, loadDashboard, roomName, ready]);

  useEffect(() => {
    if (!canUseTeacherData || !activeSurvey) {
      return;
    }

    let alive = true;
    void fetchResponses(activeSurvey.id, true, roomName)
      .then((nextResponses) => {
        if (alive) setResponses(nextResponses);
      })
      .catch((error) => {
        if (alive) {
          setMessage(
            error instanceof Error ? error.message : "응답을 불러오지 못했습니다.",
          );
        }
      });

    return () => {
      alive = false;
    };
  }, [activeSurvey, canUseTeacherData, roomName]);

  useEffect(() => {
    if (typeof window === "undefined" || !roomName) {
      setStudentUrl("");
      setQrDataUrl("");
      return;
    }

    const basePath = process.env.NODE_ENV === "production" ? "/your-own-demand" : "";
    const nextStudentUrl = `${window.location.origin}${basePath}${buildStudentPath(
      roomName,
      activeSurvey?.id,
    )}`;
    let alive = true;

    setStudentUrl(nextStudentUrl);
    setCopied(false);
    QRCode.toDataURL(nextStudentUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#152036",
        light: "#ffffff",
      },
    })
      .then((nextQrDataUrl) => {
        if (alive) {
          setQrDataUrl(nextQrDataUrl);
        }
      })
      .catch(() => {
        if (alive) {
          setQrDataUrl("");
        }
      });

    return () => {
      alive = false;
    };
  }, [activeSurvey?.id, roomName]);

  async function copyStudentUrl() {
    if (!studentUrl) {
      return;
    }

    await navigator.clipboard.writeText(studentUrl);
    setCopied(true);
  }

  const classCount = useMemo(
    () =>
      new Set(
        responses.map(
          (response) => `${response.grade}-${response.class_number}`,
        ),
      ).size,
    [responses],
  );

  const todayResponses = useMemo(() => {
    const today = new Date().toDateString();
    return responses.filter(
      (response) => new Date(response.created_at).toDateString() === today,
    ).length;
  }, [responses]);

  const productCount = activeSurvey?.products.length ?? 0;
  const lastResponse = responses[0];

  return (
    <TeacherAuthGate>
      <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름으로 만든 설문만 대시보드에 표시됩니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
      variant="teacher"
    >
      <TeacherShell
        active="dashboard"
        roomName={roomName}
        selectedLessonId={activeSurvey?.id ?? ""}
      >
        <div className="teacher-dashboard">
        <TeacherPageHeader
          actions={
            <>
              <Link
                className="error-report-button compact-button"
                href={ERROR_REPORT_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink size={16} />
                오류 기재
              </Link>
            </>
          }
          description="학생을 초대하고, 쌓이는 응답을 바로 확인하세요."
          eyebrow="LIVE CLASSROOM"
          title="오늘의 수요·공급 수업"
        />

        {!hasRemoteDatabase ? (
          <div className="teacher-alert" data-tone="warn">
            Firebase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
          </div>
        ) : null}
        {message ? <div className="teacher-alert">{message}</div> : null}

        <Link className="dashboard-guide-card" href="/teacher/guide">
          <span className="dashboard-guide-card-icon">
            <BookOpen size={22} />
          </span>
          <span className="dashboard-guide-card-copy">
            <span className="dashboard-section-kicker">활용 안내</span>
            <strong>교사용·학생용 영상을 보고 수업 흐름을 한눈에 확인하세요</strong>
            <span>수업 준비부터 응답 제출과 수요곡선 결과까지 안내합니다.</span>
          </span>
          <ArrowRight aria-hidden="true" size={22} />
        </Link>

        <section className="dashboard-lesson-hero">
          <div className="dashboard-lesson-copy">
            <span className="dashboard-live-badge">
              <Radio size={14} />
              {activeSurvey ? "진행 중" : "준비 필요"}
            </span>
            <div>
              <p className="dashboard-lesson-label">활성 설문</p>
              <h2>{activeSurvey?.title ?? "첫 설문을 만들어 주세요"}</h2>
              <p className="dashboard-lesson-meta">
                {activeSurvey
                  ? `${productCount}개 상황 · ${
                      lastResponse
                        ? `마지막 응답 ${formatRelativeTime(lastResponse.created_at)}`
                        : "학생 입장을 기다리고 있어요"
                    }`
                  : "설문 세팅에서 수업에 사용할 상황을 저장해 주세요."}
              </p>
            </div>
          </div>
          <div className="dashboard-lesson-actions">
            <Link className="dashboard-text-button" href="/teacher/setup">
              <Settings2 size={16} />
              설문 수정
            </Link>
            <Link className="dashboard-result-button" href="/teacher/results">
              <BarChart3 size={16} />
              실시간 결과
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <div className="dashboard-workspace">
          <section className="dashboard-share-card">
            <div className="dashboard-share-copy">
              <span className="dashboard-card-icon">
                <Link2 size={21} />
              </span>
              <div>
                <p className="dashboard-section-kicker">학생 초대</p>
                <h2>QR만 보여주면 바로 시작할 수 있어요</h2>
                <p>
                  학생은 로그인 없이 <strong>{roomName}</strong> 방의 활성 설문으로
                  입장합니다.
                </p>
              </div>
              <div className="dashboard-link-box">
                <span>{studentUrl}</span>
                <button onClick={() => void copyStudentUrl()} type="button">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "복사됨" : "링크 복사"}
                </button>
              </div>
              <Link
                className="dashboard-open-student"
                href={buildStudentPath(roomName, activeSurvey?.id)}
                target="_blank"
              >
                <ExternalLink size={16} />
                학생 화면 미리보기
              </Link>
            </div>
            <div className="dashboard-qr-wrap">
              <div className="dashboard-qr" aria-label="학생 화면 입장 QR 코드">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${roomName} 학생 화면 QR 코드`} src={qrDataUrl} />
                ) : (
                  <QrCode size={72} />
                )}
              </div>
              <span>카메라로 스캔</span>
            </div>
          </section>

          <aside className="dashboard-summary" aria-label="대시보드 요약">
            <div className="dashboard-summary-head">
              <p>오늘의 참여</p>
              <span>실시간</span>
            </div>
            <article className="dashboard-primary-stat">
              <span>총 응답</span>
              <strong>{responses.length}<small>명</small></strong>
              <p>오늘 새로 {todayResponses}명이 참여했어요</p>
            </article>
            <div className="dashboard-mini-stats">
              <article>
                <Users size={17} />
                <div>
                  <strong>{classCount}</strong>
                  <span>참여 학급</span>
                </div>
              </article>
              <article>
                <BookOpen size={17} />
                <div>
                  <strong>{surveys.length}</strong>
                  <span>저장 설문</span>
                </div>
              </article>
            </div>
            <Link className="dashboard-summary-link" href="/teacher/responses">
              응답 자세히 보기
              <ArrowRight size={15} />
            </Link>
          </aside>
        </div>

        <section className="dashboard-activity-card">
          <div className="dashboard-activity-head">
            <div>
              <p className="dashboard-section-kicker">LIVE FEED</p>
              <h2>최근 응답</h2>
            </div>
            <div>
              {loading ? <StatusBadge>불러오는 중</StatusBadge> : null}
              <Link href="/teacher/responses">
                전체 보기
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div className="activity-list">
              {responses.slice(0, 4).map((response) => (
                <div className="activity-row" key={response.id}>
                  <span className="activity-dot" />
                  <span>{formatRelativeTime(response.created_at)}</span>
                  <strong>
                    {response.grade}학년 {response.class_number}반{" "}
                    {response.student_name || "학생"} 응답
                  </strong>
                  <StatusBadge tone="green">
                    <Users size={12} />
                    1
                  </StatusBadge>
                </div>
              ))}
              {!responses.length ? (
                <div className="dashboard-empty-activity">
                  <span><Clock size={21} /></span>
                  <div>
                    <strong>학생 입장을 기다리는 중이에요</strong>
                    <p>위 QR 코드를 화면에 띄우면 응답이 여기에 실시간으로 표시됩니다.</p>
                  </div>
                </div>
              ) : null}
          </div>
        </section>
        </div>
      </TeacherShell>
      </RoomGate>
    </TeacherAuthGate>
  );
}
