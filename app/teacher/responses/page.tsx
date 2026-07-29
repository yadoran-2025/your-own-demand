"use client";

import { RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TeacherAuthGate } from "@/components/TeacherAuthGate";
import { useAuth } from "@/components/AuthProvider";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import {
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import {
  deleteStudentResponse,
  ensureRoomHasDefaultSurveys,
  fetchResponses,
  fetchSurveys,
  hasRemoteDatabase,
  updateStudentResponse,
} from "@/lib/data";
import { TEACHER_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import { canAccessTeacherData } from "@/lib/teacher-access";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";
import type {
  PricePoint,
  Product,
  QuantityMap,
  ResponseItem,
  StudentProfile,
  StudentResponse,
  Survey,
} from "@/lib/types";
import { formatWon } from "@/lib/utils";

type ResponseItemRow = {
  item: ResponseItem;
  product?: Product;
  pricePoint?: PricePoint;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildItemRows(survey: Survey | undefined, response: StudentResponse | undefined) {
  if (!survey || !response) {
    return [];
  }

  const productById = new Map(
    survey.products.map((product) => [product.id, product]),
  );
  const pricePointById = new Map(
    survey.products.flatMap((product) =>
      product.price_points.map((pricePoint) => [pricePoint.id, pricePoint]),
    ),
  );

  return response.response_items
    .map((item): ResponseItemRow => ({
      item,
      product: productById.get(item.product_id),
      pricePoint: pricePointById.get(item.price_point_id),
    }))
    .sort((a, b) => {
      const productOrder =
        (a.product?.sort_order ?? 999) - (b.product?.sort_order ?? 999);
      if (productOrder) {
        return productOrder;
      }
      return (a.pricePoint?.sort_order ?? 999) - (b.pricePoint?.sort_order ?? 999);
    });
}

export default function TeacherResponsesPage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const { ready: authReady, isTeacher, demoMode } = useAuth();
  const {
    workspace,
    ready: workspaceReady,
    setSelectedLessonId: setWorkspaceLessonId,
  } = useTeacherWorkspace();
  const canUseTeacherData = canAccessTeacherData({ ready: authReady, isTeacher, demoMode });
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [profileDraft, setProfileDraft] = useState<StudentProfile>({
    grade: 1,
    class_number: 1,
    student_number: 1,
    student_name: "",
  });
  const [quantityDraft, setQuantityDraft] = useState<QuantityMap>({});
  const [filter, setFilter] = useState({ grade: "all", classNumber: "all", query: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedSurvey =
    surveys.find((survey) => survey.id === selectedSurveyId) ?? surveys[0];
  const selectedResponse =
    responses.find((response) => response.id === selectedResponseId) ??
    responses[0];
  const itemRows = useMemo(
    () => buildItemRows(selectedSurvey, selectedResponse),
    [selectedResponse, selectedSurvey],
  );

  const loadSurveys = useCallback(async (preferredSurveyId?: string) => {
    if (!canUseTeacherData) return;
    if (!roomName) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await ensureRoomHasDefaultSurveys(roomName);
      const nextSurveys = await fetchSurveys(roomName);
      setSurveys(nextSurveys);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === preferredSurveyId) ??
        nextSurveys[0];
      setSelectedSurveyId(nextSurvey?.id ?? "");
      setWorkspaceLessonId(nextSurvey?.id ?? "");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "설문을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [canUseTeacherData, roomName, setWorkspaceLessonId]);

  const loadResponses = useCallback(async (surveyId: string, preferredResponseId?: string) => {
    if (!canUseTeacherData) return;
    if (!surveyId) {
      setResponses([]);
      setSelectedResponseId("");
      return;
    }

    try {
      const nextResponses = await fetchResponses(surveyId, false, roomName);
      setResponses(nextResponses);
      const nextResponse =
        nextResponses.find((response) => response.id === preferredResponseId) ??
        nextResponses[0];
      setSelectedResponseId(nextResponse?.id ?? "");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "응답을 불러오지 못했습니다.",
      );
    }
  }, [canUseTeacherData, roomName]);

  useEffect(() => {
    if (canUseTeacherData && ready && roomName && workspaceReady) {
      void loadSurveys(workspace.selectedLessonId);
    }
  }, [
    canUseTeacherData,
    loadSurveys,
    ready,
    roomName,
    workspace.selectedLessonId,
    workspaceReady,
  ]);

  useEffect(() => {
    if (!canUseTeacherData) return;
    void loadResponses(selectedSurvey?.id ?? "");
  }, [canUseTeacherData, loadResponses, selectedSurvey?.id]);

  useEffect(() => {
    if (!selectedResponse) {
      setProfileDraft({
        grade: 1,
        class_number: 1,
        student_number: 1,
        student_name: "",
      });
      setQuantityDraft({});
      return;
    }

    setProfileDraft({
      grade: selectedResponse.grade,
      class_number: selectedResponse.class_number,
      student_number: selectedResponse.student_number,
      student_name: selectedResponse.student_name,
    });
    setQuantityDraft(
      Object.fromEntries(
        selectedResponse.response_items.map((item) => [item.id, item.quantity]),
      ),
    );
  }, [selectedResponse]);

  const grades = useMemo(
    () => Array.from(new Set(responses.map((response) => response.grade))).sort((a, b) => a - b),
    [responses],
  );
  const classes = useMemo(
    () =>
      Array.from(
        new Set(
          responses
            .filter((response) => filter.grade === "all" || String(response.grade) === filter.grade)
            .map((response) => response.class_number),
        ),
      ).sort((a, b) => a - b),
    [filter.grade, responses],
  );
  const filteredResponses = useMemo(() => {
    const query = filter.query.trim().toLowerCase();
    return responses.filter((response) => {
      const matchesGrade = filter.grade === "all" || String(response.grade) === filter.grade;
      const matchesClass =
        filter.classNumber === "all" || String(response.class_number) === filter.classNumber;
      const matchesQuery =
        !query ||
        response.student_name.toLowerCase().includes(query) ||
        String(response.student_number).includes(query);
      return matchesGrade && matchesClass && matchesQuery;
    });
  }, [filter, responses]);

  function setProfileNumber(field: "grade" | "class_number" | "student_number", value: string) {
    const numeric = Number(value);
    setProfileDraft((current) => ({
      ...current,
      [field]: Number.isFinite(numeric) ? Math.max(1, Math.round(numeric)) : 1,
    }));
  }

  function setQuantity(itemId: string, value: string) {
    const numeric = Number(value);
    setQuantityDraft((current) => ({
      ...current,
      [itemId]: Number.isFinite(numeric)
        ? Math.min(100, Math.max(0, Math.round(numeric)))
        : 0,
    }));
  }

  async function handleSave() {
    if (!canUseTeacherData) return;
    if (!selectedSurvey || !selectedResponse) {
      return;
    }

    setMessage("");
    try {
      await updateStudentResponse(
        selectedSurvey.id,
        selectedResponse.id,
        profileDraft,
        quantityDraft,
        roomName,
      );
      setMessage("응답이 저장되었습니다.");
      await loadResponses(selectedSurvey.id, selectedResponse.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답을 저장하지 못했습니다.");
    }
  }

  async function handleDelete() {
    if (!canUseTeacherData) return;
    if (!selectedSurvey || !selectedResponse) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedResponse.student_name || "선택한 학생"} 응답을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    try {
      await deleteStudentResponse(selectedSurvey.id, selectedResponse.id, roomName);
      setMessage("응답이 삭제되었습니다.");
      await loadResponses(selectedSurvey.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답을 삭제하지 못했습니다.");
    }
  }

  return (
    <TeacherAuthGate>
      <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름의 학생 응답만 관리할 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
      variant="teacher"
    >
      <TeacherShell
        active="responses"
        roomName={roomName}
        selectedLessonId={selectedSurvey?.id}
      >
        <TeacherPageHeader
          actions={
            <>
              <RoomBadge roomName={roomName} onReset={() => setRoomName("")} />
              <button
                className="secondary-button compact-button"
                onClick={() => void loadResponses(selectedSurvey?.id ?? "")}
                type="button"
              >
                <RefreshCw size={16} />
                새로고침
              </button>
            </>
          }
          description="학생별 원본 응답을 확인하고, 잘못 제출된 응답을 수정하거나 삭제합니다."
          eyebrow="대시보드 / 응답 관리"
          title="응답 관리"
        />

        {!hasRemoteDatabase ? (
          <div className="teacher-alert" data-tone="warn">
            Firebase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
          </div>
        ) : null}
        {message ? <div className="teacher-alert">{message}</div> : null}
        {loading ? <div className="teacher-alert">설문을 불러오는 중입니다.</div> : null}

        <section className="teacher-card filter-card">
          <div className="response-filter-bar">
            <label>
              <span className="field-label">설문</span>
              <select
                className="input"
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => {
                  setSelectedSurveyId(event.target.value);
                  setWorkspaceLessonId(event.target.value);
                  setSelectedResponseId("");
                }}
              >
                {surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">학년</span>
              <select
                className="input"
                value={filter.grade}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    grade: event.target.value,
                    classNumber: "all",
                  }))
                }
              >
                <option value="all">전체</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}학년
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">반</span>
              <select
                className="input"
                value={filter.classNumber}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    classNumber: event.target.value,
                  }))
                }
              >
                <option value="all">전체</option>
                {classes.map((classNumber) => (
                  <option key={classNumber} value={classNumber}>
                    {classNumber}반
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">검색</span>
              <input
                className="input"
                placeholder="이름 또는 번호"
                value={filter.query}
                onChange={(event) =>
                  setFilter((current) => ({ ...current, query: event.target.value }))
                }
              />
            </label>
          </div>
        </section>

        <div className="response-manager-layout">
          <section className="teacher-card response-list-panel">
            <div className="response-panel-header">
              <h2>응답 목록</h2>
              <span>{filteredResponses.length}명</span>
            </div>
            <div className="response-list">
              {filteredResponses.map((response) => (
                <button
                  className="response-list-item"
                  data-active={response.id === selectedResponse?.id}
                  key={response.id}
                  onClick={() => setSelectedResponseId(response.id)}
                  type="button"
                >
                  <strong>
                    {response.grade}학년 {response.class_number}반{" "}
                    {response.student_name || "이름 없음"}
                  </strong>
                  <span>
                    {response.student_number}번 · {formatDateTime(response.created_at)}
                  </span>
                </button>
              ))}
              {!filteredResponses.length ? (
                <div className="empty-state compact-empty">
                  <p>표시할 응답이 없습니다.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="teacher-card response-detail-panel">
            {selectedResponse ? (
              <>
                <div className="response-panel-header">
                  <div>
                    <h2>{selectedResponse.student_name || "이름 없음"} 응답</h2>
                    <span>{formatDateTime(selectedResponse.created_at)} 제출</span>
                  </div>
                  <div className="teacher-inline-actions">
                    <button
                      className="danger-button compact-button"
                      onClick={() => void handleDelete()}
                      type="button"
                    >
                      <Trash2 size={16} />
                      삭제
                    </button>
                    <button
                      className="primary-button compact-button"
                      onClick={() => void handleSave()}
                      type="button"
                    >
                      <Save size={16} />
                      저장
                    </button>
                  </div>
                </div>

                <div className="response-profile-grid">
                  <label>
                    <span className="field-label">학년</span>
                    <input
                      className="input"
                      min={1}
                      type="number"
                      value={profileDraft.grade}
                      onChange={(event) => setProfileNumber("grade", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="field-label">반</span>
                    <input
                      className="input"
                      min={1}
                      type="number"
                      value={profileDraft.class_number}
                      onChange={(event) =>
                        setProfileNumber("class_number", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span className="field-label">번호</span>
                    <input
                      className="input"
                      min={1}
                      type="number"
                      value={profileDraft.student_number}
                      onChange={(event) =>
                        setProfileNumber("student_number", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span className="field-label">이름</span>
                    <input
                      className="input"
                      value={profileDraft.student_name}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          student_name: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="response-items-table">
                  <div className="response-items-head">
                    <span>상황</span>
                    <span>가격 구성</span>
                    <span>가격</span>
                    <span>수량</span>
                  </div>
                  {itemRows.map(({ item, product, pricePoint }) => (
                    <div className="response-items-row" key={item.id}>
                      <span>{product?.name ?? "삭제된 상황"}</span>
                      <span>{pricePoint?.description || "가격 구성"}</span>
                      <span>{pricePoint ? formatWon(pricePoint.price) : "-"}</span>
                      <input
                        className="input quantity-input"
                        max={100}
                        min={0}
                        type="number"
                        value={quantityDraft[item.id] ?? 0}
                        onChange={(event) => setQuantity(item.id, event.target.value)}
                      />
                    </div>
                  ))}
                  {!itemRows.length ? (
                    <div className="empty-state compact-empty">
                      <p>이 응답에 저장된 가격별 수량이 없습니다.</p>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h2>선택된 응답이 없습니다.</h2>
                <p>왼쪽 목록에서 학생 응답을 선택해 주세요.</p>
              </div>
            )}
          </section>
        </div>
      </TeacherShell>
      </RoomGate>
    </TeacherAuthGate>
  );
}
