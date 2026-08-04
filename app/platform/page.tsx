import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleAlert, Clock3, Plus, Radio } from "lucide-react";
import { apps, recentActivity, students } from "./mock-data";
import styles from "./platform.module.css";

export default function PlatformDashboard() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>8월 2일 일요일 · 2학기 준비 기간</p>
          <h1>수업의 흐름을<br /><em>한 장에.</em></h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconButton} aria-label="알림" type="button"><Clock3 size={19} /></button>
          <Link className={styles.primaryButton} href="/platform/apps"><Plus size={18} /> 수업 도구 연결</Link>
        </div>
      </header>

      <section className={styles.liveLesson} aria-labelledby="live-lesson-title">
        <div className={styles.liveRail}>
          <span>3교시</span>
          <strong>10:40</strong>
          <i />
          <small>11:30 종료</small>
        </div>
        <div className={styles.liveCopy}>
          <span className={styles.liveBadge}><Radio size={13} /> 지금 수업 중</span>
          <h2 id="live-lesson-title">가격이 오르면 얼마나 덜 살까?</h2>
          <p>수요곡선 실험 · 바나나 가격 활동</p>
        </div>
        <div className={styles.liveProgress}>
          <div><strong>24</strong><span>/ 28명 제출</span></div>
          <div className={styles.progressTrack}><i /></div>
          <Link href="/teacher">수업 화면 열기 <ArrowRight size={16} /></Link>
        </div>
      </section>

      <div className={styles.dashboardGrid}>
        <section className={styles.ledgerCard} aria-labelledby="ledger-title">
          <div className={styles.sectionHeading}>
            <div><p>2학년 3반</p><h2 id="ledger-title">학생 참여 출석부</h2></div>
            <Link href="/platform/students">전체 학생 <ChevronRight size={17} /></Link>
          </div>
          <div className={styles.ledger}>
            <div className={styles.ledgerHead}><span>학생</span><span>수요</span><span>선택</span><span>상태</span></div>
            {students.slice(0, 5).map((student) => (
              <Link className={styles.ledgerRow} href={`/platform/students/${student.id}`} key={student.id}>
                <span><i>{student.number}</i><strong>{student.name}</strong></span>
                <span className={styles.punches} aria-label={`수요 활동 ${student.demand}회`}>
                  {[0, 1, 2].map((value) => <i data-on={value < student.demand} key={value} />)}
                </span>
                <span className={`${styles.punches} ${styles.orange}`} aria-label={`선택 활동 ${student.choice}회`}>
                  {[0, 1].map((value) => <i data-on={value < student.choice} key={value} />)}
                </span>
                <span className={styles.state} data-state={student.state}>{student.state}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.activityCard} aria-labelledby="activity-title">
          <div className={styles.sectionHeading}>
            <div><p>실시간</p><h2 id="activity-title">방금 들어온 기록</h2></div>
            <span className={styles.activityPulse} />
          </div>
          <div className={styles.activityList}>
            {recentActivity.map((activity) => (
              <div className={styles.activityItem} key={`${activity.student}-${activity.time}`}>
                <span className={styles.activityDot} data-color={activity.color} />
                <div><strong>{activity.student}</strong><p>{activity.action}</p><small>{activity.app}</small></div>
                <time>{activity.time}</time>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.toolSection} aria-labelledby="tools-title">
        <div className={styles.sectionHeading}>
          <div><p>연결 상태</p><h2 id="tools-title">내 수업 도구</h2></div>
          <Link href="/platform/apps">도구 관리 <ChevronRight size={17} /></Link>
        </div>
        <div className={styles.toolGrid}>
          {apps.map((app, index) => (
            <article className={styles.toolCard} data-color={app.color} key={app.id}>
              <div className={styles.toolIndex}>0{index + 1}</div>
              <div><span>{app.shortName}</span><h3>{app.name}</h3><p>{app.description}</p></div>
              <footer><span><Check size={14} /> {app.status}</span><button type="button">열기 <ArrowRight size={15} /></button></footer>
            </article>
          ))}
          <Link className={styles.addToolCard} href="/platform/apps#connect">
            <span><Plus size={22} /></span>
            <div><h3>웹앱 C 연결하기</h3><p>화면만 준비되어 있어도 시작할 수 있어요.</p></div>
          </Link>
        </div>
      </section>

      <section className={styles.attentionBar}>
        <CircleAlert size={20} />
        <div><strong>확인이 필요한 학생이 2명 있어요.</strong><span>미참여 기록과 연결되지 않은 활동을 확인해 주세요.</span></div>
        <Link href="/platform/students">확인하기 <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
