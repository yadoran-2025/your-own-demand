"use client";

import { useAuth } from "@/components/AuthProvider";

export function TeacherAuthGate({ children }: { children: React.ReactNode }) {
  const { ready, isTeacher, demoMode, signInTeacher } = useAuth();
  if (!ready) return <main className="teacher-login">로그인 상태를 확인하는 중입니다.</main>;
  if (demoMode) return children;
  if (!isTeacher) {
    return (
      <main className="teacher-login">
        <h1>교사 로그인</h1>
        <p>내 수업 방과 학생 응답을 관리하려면 Google 계정으로 로그인하세요.</p>
        <button className="primary-button" onClick={() => void signInTeacher()} type="button">
          Google로 로그인
        </button>
      </main>
    );
  }
  return children;
}
