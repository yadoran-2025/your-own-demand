"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppWindow, Bell, LayoutDashboard, School, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import styles from "../platform.module.css";

const navItems = [
  { href: "/platform", label: "통합 홈", icon: LayoutDashboard },
  { href: "/platform/students", label: "학생", icon: UsersRound },
  { href: "/platform/apps", label: "수업 도구", icon: AppWindow },
] as const;

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/platform">
          <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>
          <span><strong>교실로그</strong><small>수업 도구 플랫폼</small></span>
        </Link>

        <div className={styles.schoolCard}>
          <span className={styles.schoolIcon}><School size={18} /></span>
          <span><small>현재 학급</small><strong>한빛고 · 2학년 3반</strong></span>
          <button aria-label="학급 변경" type="button">⌄</button>
        </div>

        <nav className={styles.nav} aria-label="플랫폼 메뉴">
          {navItems.map((item) => {
            const active = item.href === "/platform"
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link data-active={active} href={item.href} key={item.href}>
                <Icon size={19} strokeWidth={2.2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarNote}>
          <span>목업 미리보기</span>
          <p>실제 학생 데이터와 연결되지 않은 화면입니다.</p>
        </div>

        <div className={styles.profile}>
          <span className={styles.avatar}>김</span>
          <span><strong>김교사</strong><small>noamchomsky1571@gmail.com</small></span>
          <button aria-label="계정 메뉴" type="button">•••</button>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <Link className={styles.mobileBrand} href="/platform">교실로그</Link>
          <button aria-label="알림" type="button"><Bell size={20} /></button>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
