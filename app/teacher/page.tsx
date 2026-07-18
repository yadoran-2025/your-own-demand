"use client";

import Link from "next/link";
import QRCode from "qrcode";
import {
  BarChart3,
  BookOpen,
  Check,
  Clock,
  Copy,
  ExternalLink,
  QrCode,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import {
  ensureRoomHasDefaultSurveys,
  fetchResponses,
  fetchSurveys,
  hasRemoteDatabase,
} from "@/lib/data";
import {
  buildStudentPath,
  TEACHER_ROOM_KEY,
  useStoredRoomName,
} from "@/lib/roomName";
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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [studentUrl, setStudentUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const activeSurvey = surveys[0];

  const loadDashboard = useCallback(async () => {
    if (!roomName) {
      return;
    }

    setLoading(true);
    try {
      await ensureRoomHasDefaultSurveys(roomName);
      const nextSurveys = await fetchSurveys(roomName, true);
      setSurveys(nextSurveys);

      if (nextSurveys[0]) {
        setResponses(await fetchResponses(nextSurveys[0].id, true, roomName));
      } else {
        setResponses([]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "대시보드를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [roomName]);

  useEffect(() => {
    if (ready && roomName) {
      void loadDashboard();
    }
  }, [loadDashboard, roomName, ready]);

  useEffect(() => {
    if (typeof window === "undefined" || !roomName) {
      setStudentUrl("");
      setQrDataUrl("");
      return;
    }

    const basePath = process.env.NODE_ENV === "production" ? "/your-own-demand" : "";
    const nextStudentUrl = `${window.location.origin}${basePath}${buildStudentPath(roomName)}`;
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
  }, [roomName]);

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
    <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름으로 만든 설문만 대시보드에 표시됩니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
    >
      <TeacherShell active="dashboard" roomName={roomName}>
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
              <RoomBadge roomName={roomName} onReset={() => setRoomName("")} />
            </>
          }
          description="설문을 준비하고 실시간 응답 결과를 확인하세요."
          title="우리들의 수요-공급 곡선은?"
        />

        {!hasRemoteDatabase ? (
          <div className="teacher-alert" data-tone="warn">
            Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
          </div>
        ) : null}
        {message ? <div className="teacher-alert">{message}</div> : null}

        <section className="active-survey-bar">
          <div className="active-survey-left">
            <span className="active-survey-dot" />
            <div>
              <h2>{activeSurvey?.title ?? "아직 활성 설문이 없습니다"}</h2>
              <p>
                {activeSurvey
                  ? `${productCount}개 상황 · ${
                      lastResponse
                        ? `마지막 응답 ${formatRelativeTime(lastResponse.created_at)}`
                        : "응답 대기 중"
                    }`
                  : "설문 세팅에서 첫 설문을 저장해 주세요."}
              </p>
            </div>
          </div>
          <div className="teacher-inline-actions">
            <Link className="secondary-button compact-button" href="/teacher/setup">
              세팅 수정
            </Link>
            <Link className="secondary-button compact-button" href="/teacher/guide">
              <BookOpen size={16} />
              활용 안내
            </Link>
            <Link className="primary-button compact-button" href="/teacher/results">
              <BarChart3 size={16} />
              결과 보기
            </Link>
          </div>
        </section>

        <section className="teacher-stat-grid" aria-label="대시보드 요약">
          <article className="teacher-stat-card">
            <span>총 응답 수</span>
            <strong>{responses.length}</strong>
            <p>오늘 +{todayResponses}명 응답</p>
          </article>
          <article className="teacher-stat-card">
            <span>참여 학급</span>
            <strong>{classCount}</strong>
            <p>{classCount ? "응답 기준 집계" : "아직 응답 없음"}</p>
          </article>
          <article className="teacher-stat-card">
            <span>저장된 설문</span>
            <strong>{surveys.length}</strong>
            <p>{activeSurvey ? "활성 1개" : "새 설문 필요"}</p>
          </article>
        </section>

        <section className="student-entry-card">
          <div className="student-entry-main">
            <span className="student-entry-icon">
              <QrCode size={24} />
            </span>
            <div>
              <p className="student-entry-kicker">학생 입장 링크</p>
              <h2>{roomName} 학생 화면</h2>
              <p>
                학생은 QR을 스캔하거나 링크를 열면 이 방 이름의 설문 화면으로 바로 입장합니다.
              </p>
            </div>
            <div className="student-link-row">
              <input className="input" readOnly value={studentUrl} />
              <button
                className="secondary-button compact-button"
                onClick={() => void copyStudentUrl()}
                type="button"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "복사됨" : "복사"}
              </button>
              <Link
                className="primary-button compact-button"
                href={buildStudentPath(roomName)}
                target="_blank"
              >
                <ExternalLink size={16} />
                열기
              </Link>
            </div>
          </div>
          <div className="student-entry-qr" aria-label="학생 화면 입장 QR 코드">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${roomName} 학생 화면 QR 코드`} src={qrDataUrl} />
            ) : (
              <QrCode size={72} />
            )}
          </div>
        </section>

        <section className="teacher-card">
          <div className="teacher-card-body">
            <div className="teacher-section-title">
              <h2>최근 응답 활동</h2>
              {loading ? <StatusBadge>불러오는 중</StatusBadge> : null}
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
                <div className="empty-state compact-empty">
                  <Clock size={22} />
                  <p>아직 학생 응답이 없습니다.</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </TeacherShell>
    </RoomGate>
  );
}
