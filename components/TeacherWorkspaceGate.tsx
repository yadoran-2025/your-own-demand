"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  addClass,
  createRoomKey,
  removeClass,
  selectClass,
  useTeacherWorkspace,
  validateSchoolDetails,
} from "@/lib/teacher-workspace";

type TeacherWorkspaceGateProps = {
  children: ReactNode;
  ready: boolean;
  roomName: string;
  setRoomName: (roomName: string) => void;
};

export function TeacherWorkspaceGate({
  children,
  ready,
  roomName,
  setRoomName,
}: TeacherWorkspaceGateProps) {
  const { workspace, ready: workspaceReady, setWorkspace } = useTeacherWorkspace();
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [schoolSaved, setSchoolSaved] = useState(false);
  const workspaceHydrated = useRef(false);

  useEffect(() => {
    if (workspaceReady && !workspaceHydrated.current) {
      workspaceHydrated.current = true;
      setSchoolSaved(!validateSchoolDetails(workspace));
    }
  }, [workspace, workspaceReady]);

  if (!ready || !workspaceReady) return null;
  if (roomName) return <>{children}</>;

  const schoolError = validateSchoolDetails(workspace);

  function saveSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (schoolError) {
      setError(schoolError);
      return;
    }
    setWorkspace({ ...workspace, region: workspace.region.trim(), school: workspace.school.trim(), grade: workspace.grade.trim() });
    setError("");
    setSchoolSaved(true);
  }

  function addWorkspaceClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addClass(workspace.classes, className);
    if (result.error) {
      setError(result.error);
      return;
    }
    setWorkspace({ ...workspace, classes: result.classes });
    setClassName("");
    setError("");
  }

  if (!schoolSaved) {
    return (
      <main className="teacher-workspace-gate">
        <section className="teacher-workspace-intro">
          <span>수요곡선 수업</span>
          <h1>우리 반 수업을<br />바로 시작하세요.</h1>
          <p>학교와 학년을 설정하고, 학급별 수요곡선 활동을 관리하세요.</p>
        </section>
        <form className="teacher-workspace-panel" onSubmit={saveSchool}>
          <span className="teacher-workspace-step">1 / 2 · 학교와 학년</span>
          <h2>수업 공간 만들기</h2>
          <p>다음 단계에서 학급을 추가해 학생 링크를 만들 수 있습니다.</p>
          <label className="teacher-workspace-field">
            <span>지역</span>
            <input autoFocus onChange={(event) => setWorkspace({ ...workspace, region: event.target.value })} placeholder="예: 서울" required value={workspace.region} />
          </label>
          <label className="teacher-workspace-field">
            <span>학교</span>
            <input onChange={(event) => setWorkspace({ ...workspace, school: event.target.value })} placeholder="예: 통합사회고" required value={workspace.school} />
          </label>
          <label className="teacher-workspace-field">
            <span>학년</span>
            <input onChange={(event) => setWorkspace({ ...workspace, grade: event.target.value })} placeholder="예: 3학년" required value={workspace.grade} />
          </label>
          {error ? <p className="teacher-workspace-error">{error}</p> : null}
          <button className="teacher-workspace-action" type="submit">학교와 학년 만들기 / 입장</button>
        </form>
      </main>
    );
  }

  return (
    <main className="teacher-workspace-gate teacher-workspace-class-gate">
      <section className="teacher-workspace-intro">
        <span>수요곡선 수업</span>
        <h1>{workspace.school}<br />{workspace.grade} 수업 공간</h1>
        <p>학급을 선택하면 해당 학급의 설문과 응답을 엽니다.</p>
      </section>
      <section className="teacher-workspace-panel">
        <span className="teacher-workspace-step">2 / 2 · 학급 선택</span>
        <h2>어느 학급인가요?</h2>
        <p>새 학급을 추가하거나, 이미 만든 학급을 선택하세요.</p>
        <div className="teacher-workspace-class-list">
          {workspace.classes.map((value) => (
            <article className="teacher-workspace-class-card" key={value}>
              <strong>{value}</strong>
              <div>
                <button onClick={() => {
                  setWorkspace(selectClass(workspace, value));
                  setRoomName(createRoomKey(workspace, value));
                }} type="button">이 학급으로 입장</button>
                <button onClick={() => {
                  if (window.confirm(`${value}을(를) 삭제할까요?`)) {
                    setWorkspace({
                      ...workspace,
                      classes: removeClass(workspace.classes, value),
                      selectedClass: workspace.selectedClass === value
                        ? ""
                        : workspace.selectedClass,
                      selectedLessonId: workspace.selectedClass === value
                        ? ""
                        : workspace.selectedLessonId,
                    });
                  }
                }} type="button">삭제</button>
              </div>
            </article>
          ))}
        </div>
        <form className="teacher-workspace-new-class" onSubmit={addWorkspaceClass}>
          <label className="teacher-workspace-field">
            <span>새 학급</span>
            <input onChange={(event) => setClassName(event.target.value)} placeholder="예: 1반" value={className} />
          </label>
          <button className="teacher-workspace-action" type="submit">학급 추가</button>
        </form>
        {error ? <p className="teacher-workspace-error">{error}</p> : null}
      </section>
    </main>
  );
}
