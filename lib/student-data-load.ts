type StudentDataLoadState = {
  roomReady: boolean;
  roomName: string;
  authReady: boolean;
  authenticated: boolean;
  demoMode: boolean;
};

export function canLoadStudentData({
  roomReady,
  roomName,
  authReady,
  authenticated,
  demoMode,
}: StudentDataLoadState) {
  return roomReady && Boolean(roomName) && (demoMode || (authReady && authenticated));
}
