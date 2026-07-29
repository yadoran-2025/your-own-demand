"use client";

import { ReactNode } from "react";
import { TeacherWorkspaceGate } from "./TeacherWorkspaceGate";
import { RoomBadge, RoomGate as StudentRoomGate } from "./PinGate";

type RoomGateProps = {
  children: ReactNode;
  description: string;
  ready: boolean;
  roomName: string;
  setRoomName: (roomName: string) => void;
  title: string;
  variant?: "student" | "teacher";
};

export function RoomGate({ variant = "student", ...props }: RoomGateProps) {
  if (variant === "teacher") return <TeacherWorkspaceGate {...props} />;
  return <StudentRoomGate {...props} />;
}

export { RoomBadge };
