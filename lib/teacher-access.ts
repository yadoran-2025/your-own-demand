export type TeacherAccessState = {
  ready: boolean;
  isTeacher: boolean;
  demoMode: boolean;
  roomName?: string;
};

export function canAccessTeacherData(state: TeacherAccessState) {
  const hasRoom = state.roomName === undefined || Boolean(state.roomName.trim());
  return hasRoom && (state.demoMode || (state.ready && state.isTeacher));
}
