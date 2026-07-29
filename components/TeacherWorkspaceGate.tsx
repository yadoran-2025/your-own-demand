"use client";

import { FormEvent, ReactNode, useState } from "react";
import {
  createRoomKey,
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
  const [error, setError] = useState("");

  if (!ready || !workspaceReady) return null;
  if (roomName) return <>{children}</>;

  const schoolError = validateSchoolDetails(workspace);

  function saveSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (schoolError) {
      setError(schoolError);
      return;
    }
    const nextWorkspace = { ...workspace, region: workspace.region.trim(), school: workspace.school.trim(), grade: workspace.grade.trim(), selectedClass: "" };
    setWorkspace(nextWorkspace);
    setRoomName(createRoomKey(nextWorkspace));
    setError("");
  }

  return (
      <main className="teacher-workspace-gate">
        <section className="teacher-workspace-layout">
        <section className="teacher-workspace-intro">
          <div className="teacher-workspace-mark">⌁</div><span>교사용 수업 운영</span>
          <h1>수요곡선 활동</h1><p>학교와 학년을 설정하고, 학급·차시별로 수요 설문과 학생 응답을 관리합니다.</p>
          <div className="teacher-workspace-topics"><span>⌂ 학교·학년</span><span>♙ 학급 선택</span><span>⊕ 차시 QR</span></div>
        </section>
        <form className="teacher-workspace-panel" onSubmit={saveSchool}>
          <div className="teacher-workspace-steps"><span className="active">⌂ 학교·학년</span><span>♙ 반</span><span>⊕ 차시 QR</span></div>
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
        </section>
      </main>
  );
}
