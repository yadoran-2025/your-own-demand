import Link from "next/link";
import { ChevronRight, Download, Search, UserPlus } from "lucide-react";
import { students } from "../mock-data";
import styles from "../platform.module.css";

export default function StudentsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.simpleHeader}>
        <div><p className={styles.kicker}>한빛고등학교 · 2학년 3반</p><h1>학생</h1><p>수업 도구마다 흩어진 참여기록을 학생별로 확인합니다.</p></div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button"><Download size={17} /> 명단 내보내기</button>
          <button className={styles.primaryButton} type="button"><UserPlus size={17} /> 학생 추가</button>
        </div>
      </header>

      <section className={styles.rosterCard}>
        <div className={styles.rosterToolbar}>
          <label><Search size={18} /><input aria-label="학생 검색" placeholder="이름 또는 번호로 찾기" /></label>
          <div><button data-active="true" type="button">전체 28</button><button type="button">확인 필요 2</button><button type="button">미참여 1</button></div>
        </div>

        <div className={styles.rosterTable} role="table" aria-label="학생 참여 명단">
          <div className={styles.rosterHead} role="row"><span>번호 · 이름</span><span>수요곡선 실험</span><span>선택의 기회비용</span><span>최근 활동</span><span>상태</span><span /></div>
          {students.map((student) => (
            <Link className={styles.rosterRow} href={`/platform/students/${student.id}`} key={student.id} role="row">
              <span><i>{student.number}</i><strong>{student.name}</strong></span>
              <span><strong>{student.demand}</strong>회 참여</span>
              <span><strong>{student.choice}</strong>회 참여</span>
              <span>{student.lastActive}</span>
              <span className={styles.state} data-state={student.state}>{student.state}</span>
              <span><ChevronRight size={17} /></span>
            </Link>
          ))}
        </div>
        <footer className={styles.tableFooter}><span>28명 중 6명 표시</span><div><button disabled type="button">이전</button><button type="button">다음</button></div></footer>
      </section>
    </div>
  );
}
