import Link from "next/link";
import { ArrowLeft, BookOpenCheck, CalendarDays, Mail, MoreHorizontal } from "lucide-react";
import { studentTimeline, students } from "../../mock-data";
import styles from "../../platform.module.css";

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = students.find((item) => item.id === studentId) ?? students[0];

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href="/platform/students"><ArrowLeft size={17} /> 학생 명단</Link>
      <header className={styles.studentHero}>
        <div className={styles.studentIdentity}>
          <span>{student.name.slice(0, 1)}</span>
          <div><p>2학년 3반 {student.number}번</p><h1>{student.name}</h1><small>학생 ID · HB-203-{String(student.number).padStart(2, "0")}</small></div>
        </div>
        <div className={styles.headerActions}><button className={styles.secondaryButton} type="button"><Mail size={17} /> 보호자 안내</button><button className={styles.iconButton} aria-label="더보기" type="button"><MoreHorizontal size={20} /></button></div>
      </header>

      <div className={styles.studentGrid}>
        <section className={styles.timelineCard}>
          <div className={styles.sectionHeading}><div><p>모든 수업 도구</p><h2>참여기록</h2></div><button className={styles.textButton} type="button"><CalendarDays size={16} /> 기간 선택</button></div>
          <div className={styles.timeline}>
            {studentTimeline.map((item) => (
              <article key={`${item.date}-${item.title}`}>
                <span className={styles.timelineMark} data-color={item.color} />
                <time>{item.date}</time>
                <div><small>{item.app}</small><h3>{item.title}</h3><p>{item.detail}</p></div>
                <button type="button">상세 보기</button>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.studentAside}>
          <section>
            <p>참여 요약</p>
            <div className={styles.summaryNumber}><strong>{student.demand + student.choice}</strong><span>총 참여 활동</span></div>
            <dl><div><dt>수요곡선 실험</dt><dd>{student.demand}회</dd></div><div><dt>선택의 기회비용</dt><dd>{student.choice}회</dd></div><div><dt>최근 참여</dt><dd>{student.lastActive}</dd></div></dl>
          </section>
          <section className={styles.teacherMemo}>
            <span><BookOpenCheck size={19} /></span><div><p>교사 메모</p><textarea defaultValue="그래프 해석은 빠르지만 선택 이유를 문장으로 설명하는 연습이 필요함." aria-label="교사 메모" /><button type="button">메모 저장</button></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
