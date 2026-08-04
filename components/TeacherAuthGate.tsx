"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function TeacherAuthGate({ children }: { children: React.ReactNode }) {
  const { ready, isTeacher, demoMode, signInTeacher } = useAuth();
  if (!ready) {
    return (
      <main className="teacher-login teacher-login--loading">
        <div aria-live="polite" className="teacher-login-loading">
          <span aria-hidden="true" />
          로그인 상태를 확인하고 있습니다
        </div>
      </main>
    );
  }
  if (demoMode) return children;
  if (!isTeacher) {
    return (
      <main className="teacher-login">
        <div className="teacher-login-grid">
          <section className="teacher-login-story" aria-labelledby="teacher-login-title">
            <div className="teacher-login-brand">
              <span aria-hidden="true" className="teacher-login-brand-mark">D</span>
              <span>수요곡선 활동</span>
            </div>

            <div className="teacher-login-copy">
              <p className="teacher-login-eyebrow">교사용 수업 운영</p>
              <h1 id="teacher-login-title">
                학생의 선택이
                <br />
                <em>곡선이 되는 순간</em>
              </h1>
              <p>
                학생 응답을 실시간으로 모으고, 교실의 수요곡선을 함께
                완성하세요.
              </p>
            </div>

            <ul className="teacher-login-features" aria-label="주요 기능">
              <li><strong>01</strong> 실시간 응답</li>
              <li><strong>02</strong> 자동 수요곡선</li>
              <li><strong>03</strong> QR로 바로 참여</li>
            </ul>

            <svg
              aria-hidden="true"
              className="teacher-login-chart"
              viewBox="0 0 720 420"
            >
              <defs>
                <linearGradient id="demand-line" x1="0" x2="1">
                  <stop offset="0" stopColor="#087f78" />
                  <stop offset="1" stopColor="#34a89d" />
                </linearGradient>
              </defs>
              <g className="teacher-login-chart-grid">
                <path d="M90 42V354H670" />
                <path d="M90 112H670M90 182H670M90 252H670M90 322H670" />
                <path d="M190 42V354M290 42V354M390 42V354M490 42V354M590 42V354" />
              </g>
              <path
                className="teacher-login-demand"
                d="M122 78C212 114 276 155 346 209C414 261 499 305 638 336"
              />
              <path
                className="teacher-login-supply"
                d="M122 326C226 291 300 244 370 188C440 132 516 94 638 63"
              />
              <g className="teacher-login-equilibrium">
                <circle cx="357" cy="199" r="16" />
                <circle cx="357" cy="199" r="6" />
              </g>
              <text className="teacher-login-chart-label demand" x="600" y="322">D</text>
              <text className="teacher-login-chart-label supply" x="608" y="78">S</text>
            </svg>
          </section>

          <section className="teacher-login-panel" aria-labelledby="teacher-login-panel-title">
            <div className="teacher-login-panel-number" aria-hidden="true">교사용</div>
            <div>
              <p className="teacher-login-panel-label">수업 관리 시작</p>
              <h2 id="teacher-login-panel-title">내 수업으로 들어가기</h2>
              <p className="teacher-login-panel-copy">
                수업 방과 학생 응답은 선생님의 Google 계정에 안전하게
                연결됩니다.
              </p>
            </div>

            <button
              className="teacher-login-google"
              onClick={() => void signInTeacher()}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61Z" />
                <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
              </svg>
              <span>Google 계정으로 계속하기</span>
              <span aria-hidden="true" className="teacher-login-arrow">→</span>
            </button>

            <div className="teacher-login-trust">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 3 5.5 5.6v5.8c0 4.1 2.7 7.9 6.5 9.6 3.8-1.7 6.5-5.5 6.5-9.6V5.6L12 3Z" />
                <path d="m9.2 12 1.8 1.8 3.8-4" />
              </svg>
              <p><strong>교사 전용 공간</strong><br />로그인 정보는 수업 관리에만 사용됩니다.</p>
            </div>

            <Link className="teacher-login-guide" href="/teacher/guide">
              <span>활용 안내 영상 보기</span>
              <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </main>
    );
  }
  return children;
}
