export type TeacherAccessState = {
  ready: boolean;
  isTeacher: boolean;
  demoMode: boolean;
};

export function canAccessTeacherData(state: TeacherAccessState) {
  return state.demoMode || (state.ready && state.isTeacher);
}
