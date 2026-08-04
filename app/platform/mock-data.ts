export const apps = [
  {
    id: "demand",
    name: "수요곡선 실험",
    shortName: "수요",
    description: "가격 변화에 따른 학생 선택을 곡선으로 확인해요.",
    color: "blue",
    status: "수업 중",
  },
  {
    id: "choice",
    name: "선택의 기회비용",
    shortName: "선택",
    description: "제한된 시간과 자원 안에서 선택의 비용을 비교해요.",
    color: "orange",
    status: "연결됨",
  },
] as const;

export const students = [
  { id: "minji", number: 1, name: "김민지", demand: 3, choice: 2, lastActive: "오늘 10:42", state: "완료" },
  { id: "junho", number: 2, name: "이준호", demand: 3, choice: 1, lastActive: "오늘 10:39", state: "완료" },
  { id: "seoyeon", number: 3, name: "박서연", demand: 2, choice: 2, lastActive: "오늘 10:35", state: "진행 중" },
  { id: "doyun", number: 4, name: "최도윤", demand: 3, choice: 0, lastActive: "어제 14:21", state: "확인 필요" },
  { id: "yuna", number: 5, name: "정유나", demand: 3, choice: 2, lastActive: "오늘 10:41", state: "완료" },
  { id: "jiho", number: 6, name: "한지호", demand: 1, choice: 1, lastActive: "8월 1일", state: "미참여" },
] as const;

export const recentActivity = [
  { student: "김민지", app: "수요곡선 실험", action: "바나나 가격 활동을 제출했어요", time: "3분 전", color: "blue" },
  { student: "정유나", app: "수요곡선 실험", action: "학생 화면에 참여했어요", time: "4분 전", color: "blue" },
  { student: "박서연", app: "선택의 기회비용", action: "첫 번째 선택을 저장했어요", time: "8분 전", color: "orange" },
  { student: "이준호", app: "수요곡선 실험", action: "응답을 제출했어요", time: "11분 전", color: "blue" },
] as const;

export const studentTimeline = [
  { date: "오늘 · 10:42", app: "수요곡선 실험", title: "바나나 가격 활동 제출", detail: "5개 가격 구간에 모두 응답", color: "blue" },
  { date: "7월 30일 · 14:18", app: "선택의 기회비용", title: "여름방학 선택 활동 완료", detail: "3개 선택 장면 완료", color: "orange" },
  { date: "7월 24일 · 11:06", app: "수요곡선 실험", title: "대체재 활동 제출", detail: "학급 결과 확인", color: "blue" },
  { date: "7월 17일 · 09:51", app: "수요곡선 실험", title: "첫 수요곡선 활동 참여", detail: "교사 피드백 확인 전", color: "blue" },
] as const;
