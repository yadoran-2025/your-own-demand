"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buildStudentPath } from "@/lib/roomName";

type TeacherShellProps = {
  active: "dashboard" | "setup" | "results";
  children: ReactNode;
  roomName?: string;
};

const navItems = [
  { id: "dashboard", href: "/teacher", label: "대시보드" },
  { id: "setup", href: "/teacher/setup", label: "설문 세팅" },
  { id: "results", href: "/teacher/results", label: "결과 확인" },
] as const;

export function TeacherShell({ active, children, roomName = "" }: TeacherShellProps) {
  return (
    <div className="teacher-shell">
      <nav className="teacher-top-tabs" aria-label="교사용 빠른 이동">
        {navItems.map((item) => (
          <Link
            className="teacher-top-tab"
            data-active={active === item.id}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
        <span className="teacher-top-tab-divider" />
        <Link className="teacher-top-tab-student" href={buildStudentPath(roomName)}>
          학생 화면 →
        </Link>
      </nav>
      <main className="teacher-main">{children}</main>
    </div>
  );
}

type TeacherPageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function TeacherPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: TeacherPageHeaderProps) {
  return (
    <header className="teacher-page-header">
      <div>
        {eyebrow ? <p className="teacher-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="teacher-header-actions">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({
  tone = "blue",
  children,
}: {
  tone?: "blue" | "green" | "warn";
  children: ReactNode;
}) {
  return (
    <span className="status-badge" data-tone={tone}>
      {children}
    </span>
  );
}

