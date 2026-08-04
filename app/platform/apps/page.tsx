import Link from "next/link";
import { ArrowRight, Check, Code2, ExternalLink, KeyRound, Link2, Plus, ShieldCheck } from "lucide-react";
import { apps } from "../mock-data";
import styles from "../platform.module.css";

export default function AppsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.simpleHeader}>
        <div><p className={styles.kicker}>플랫폼 연결</p><h1>수업 도구</h1><p>교실로그와 연결된 웹앱을 관리하고 새 도구를 추가합니다.</p></div>
        <a className={styles.secondaryButton} href="#connect"><Plus size={17} /> 새 도구 연결</a>
      </header>

      <section className={styles.connectedApps}>
        {apps.map((app, index) => (
          <article className={styles.appManageCard} data-color={app.color} key={app.id}>
            <div className={styles.appGlyph}>0{index + 1}</div>
            <div className={styles.appManageCopy}><span><i /><strong>{app.status}</strong></span><h2>{app.name}</h2><p>{app.description}</p><small>최근 동기화 · 오늘 10:42</small></div>
            <div className={styles.appManageStats}><span><strong>{index === 0 ? "28" : "24"}</strong> 연결 학생</span><span><strong>{index === 0 ? "84" : "41"}</strong> 참여기록</span></div>
            <div className={styles.appManageActions}><button type="button">설정</button><Link href={index === 0 ? "/teacher" : "#"}>웹앱 열기 <ExternalLink size={15} /></Link></div>
          </article>
        ))}
      </section>

      <section className={styles.connectPanel} id="connect">
        <div className={styles.connectIntro}>
          <span><Code2 size={22} /></span>
          <p>새 웹앱 연결</p>
          <h2>웹앱 C는<br />껍데기만 있어도 됩니다.</h2>
          <p>공통 로그인부터 연결하고, 학생 참여기록은 준비되는 순서대로 붙이세요.</p>
        </div>
        <div className={styles.connectSteps}>
          <article><span><KeyRound size={19} /></span><div><small>첫 번째</small><h3>같은 Firebase 프로젝트 등록</h3><p>웹앱 C에 교실로그의 Google 로그인을 연결합니다.</p></div><i><Check size={15} /></i></article>
          <article><span><Link2 size={19} /></span><div><small>두 번째</small><h3>앱 정보 입력</h3><p>교사가 알아볼 이름과 웹앱 주소만 등록합니다.</p></div><i>2</i></article>
          <article><span><ShieldCheck size={19} /></span><div><small>나중에</small><h3>참여기록 API 연결</h3><p>학생 활동이 준비되면 공통 studentId와 함께 기록을 보냅니다.</p></div><i>3</i></article>
          <button className={styles.connectButton} type="button">웹앱 C 연결 시작 <ArrowRight size={17} /></button>
        </div>
      </section>
    </div>
  );
}
