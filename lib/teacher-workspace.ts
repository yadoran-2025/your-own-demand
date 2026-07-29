"use client";

import { useEffect, useState } from "react";

export interface TeacherWorkspace {
  region: string;
  school: string;
  grade: string;
  classes: string[];
}

export type SchoolDetails = Omit<TeacherWorkspace, "classes">;

export const TEACHER_WORKSPACE_KEY = "demand-app-teacher-workspace";

export function createRoomKey(workspace: TeacherWorkspace, className: string) {
  return [workspace.region, workspace.school, workspace.grade, className]
    .map((value) => value.trim())
    .join(" / ");
}

export function validateSchoolDetails(details: SchoolDetails) {
  if (!details.region.trim()) return "지역을 입력해주세요.";
  if (!details.school.trim()) return "학교를 입력해주세요.";
  if (!details.grade.trim()) return "학년을 입력해주세요.";
  return "";
}

export function addClass(classes: string[], value: string) {
  const className = value.trim();
  if (!className) return { classes, error: "학급을 입력해주세요." };
  if (classes.includes(className)) return { classes, error: "이미 등록된 학급입니다." };
  return { classes: [...classes, className], error: "" };
}

export function removeClass(classes: string[], value: string) {
  return classes.filter((className) => className !== value);
}

export function useTeacherWorkspace() {
  const [workspace, setWorkspaceState] = useState<TeacherWorkspace>({
    region: "",
    school: "",
    grade: "",
    classes: [],
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TEACHER_WORKSPACE_KEY);
      if (stored) setWorkspaceState(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(TEACHER_WORKSPACE_KEY);
    }
    setReady(true);
  }, []);

  function setWorkspace(nextWorkspace: TeacherWorkspace) {
    setWorkspaceState(nextWorkspace);
    window.localStorage.setItem(TEACHER_WORKSPACE_KEY, JSON.stringify(nextWorkspace));
  }

  return { workspace, ready, setWorkspace };
}
