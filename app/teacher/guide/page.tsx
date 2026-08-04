"use client";

import { RoomGate } from "@/components/RoomGate";
import { TeacherPageHeader, TeacherShell } from "@/components/TeacherShell";
import { TEACHER_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function TeacherGuidePage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const { workspace } = useTeacherWorkspace();

  return (
    <RoomGate
      description="교사용 방 이름을 입력하면 활용 안내 영상을 볼 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
      variant="teacher"
    >
      <TeacherShell
        active="guide"
        roomName={roomName}
        selectedLessonId={workspace.selectedLessonId}
      >
        <TeacherPageHeader
          description="교사가 수업 준비부터 학생 응답과 수요곡선 결과를 확인하는 과정을 소개합니다."
          eyebrow="활용 안내"
          title="교사용 활용 안내 영상"
        />
        <video
          aria-label="교사용 웹앱 활용 안내 영상"
          controls
          playsInline
          preload="metadata"
          src="/teacher-demo-30s.mp4"
          style={{ display: "block", width: "100%" }}
        />
        <section style={{ marginTop: "48px" }}>
          <TeacherPageHeader
            description="학생이 가격을 배정받고 구매량을 제출한 뒤 수요곡선을 확인하는 과정을 소개합니다."
            eyebrow="활용 안내"
            title="학생 화면 안내 영상"
          />
          <video
            aria-label="학생용 웹앱 활용 안내 영상"
            controls
            playsInline
            preload="metadata"
            src="/student-demo-30s.mp4"
            style={{ display: "block", width: "100%" }}
          />
        </section>
      </TeacherShell>
    </RoomGate>
  );
}
