"use client";

import { useEffect, useState } from "react";
import { Database, HardDrive, Loader2 } from "lucide-react";
import { fetchSurveys, hasRemoteDatabase } from "@/lib/data";

type StatusState = {
  surveyCount: number;
  productCount: number;
  loading: boolean;
};

export function LandingStatusPanel() {
  const [status, setStatus] = useState<StatusState>({
    surveyCount: 0,
    productCount: 0,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const surveys = await fetchSurveys();

        if (!mounted) {
          return;
        }

        setStatus({
          surveyCount: surveys.length,
          productCount: surveys.reduce(
            (total, survey) => total + survey.products.length,
            0,
          ),
          loading: false,
        });
      } catch {
        if (mounted) {
          setStatus((current) => ({ ...current, loading: false }));
        }
      }
    }

    void loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const StorageIcon = hasRemoteDatabase ? Database : HardDrive;

  return (
    <aside className="surface landing-status">
      <div className="landing-status__top">
        <div>
          <p className="landing-kicker">오늘 수업 상태</p>
          <h2>바로 시작할 수 있어요</h2>
        </div>
        {status.loading ? (
          <Loader2 className="landing-spin text-[var(--brand)]" size={24} />
        ) : (
          <StorageIcon className="text-[var(--brand)]" size={26} />
        )}
      </div>

      <div className="landing-metrics">
        <div>
          <strong>{status.loading ? "-" : status.surveyCount}</strong>
          <span>저장된 조사</span>
        </div>
        <div>
          <strong>{status.loading ? "-" : status.productCount}</strong>
          <span>준비된 상품</span>
        </div>
      </div>

      <div className="demand-preview" aria-hidden="true">
        <div className="demand-preview__axis demand-preview__axis--y">가격</div>
        <div className="demand-preview__axis demand-preview__axis--x">수요량</div>
        <span className="demand-preview__point demand-preview__point--a" />
        <span className="demand-preview__point demand-preview__point--b" />
        <span className="demand-preview__point demand-preview__point--c" />
        <span className="demand-preview__line" />
      </div>

      <ol className="landing-steps">
        <li>
          <strong>1. 준비</strong>
          <span>상품과 가격표를 정합니다.</span>
        </li>
        <li>
          <strong>2. 응답</strong>
          <span>학생이 가격별 구매량을 냅니다.</span>
        </li>
        <li>
          <strong>3. 비교</strong>
          <span>반 평균과 전체 평균을 같이 봅니다.</span>
        </li>
      </ol>

      <p className="landing-storage">
        {hasRemoteDatabase
          ? "Supabase에 응답을 저장하는 실시간 수업 모드입니다."
          : "Supabase가 없어도 이 브라우저의 localStorage로 데모 수업을 진행할 수 있습니다."}
      </p>
    </aside>
  );
}
