"use client";

import { useCallback, useEffect, useState } from "react";

export interface TeacherWorkspace {
  region: string;
  school: string;
  grade: string;
  classes: string[];
  selectedClass: string;
  selectedLessonId: string;
}

export type SchoolDetails = Pick<TeacherWorkspace, "region" | "school" | "grade">;

export const TEACHER_WORKSPACE_KEY = "demand-app-teacher-workspace";

const emptyWorkspace: TeacherWorkspace = {
  region: "",
  school: "",
  grade: "",
  classes: [],
  selectedClass: "",
  selectedLessonId: "",
};

export function normalizeTeacherWorkspace(value: unknown): TeacherWorkspace {
  const stored = value && typeof value === "object"
    ? value as Partial<TeacherWorkspace>
    : {};

  return {
    region: typeof stored.region === "string" ? stored.region : "",
    school: typeof stored.school === "string" ? stored.school : "",
    grade: typeof stored.grade === "string" ? stored.grade : "",
    classes: Array.isArray(stored.classes)
      ? stored.classes.filter((className): className is string => typeof className === "string")
      : [],
    selectedClass: typeof stored.selectedClass === "string" ? stored.selectedClass : "",
    selectedLessonId:
      typeof stored.selectedLessonId === "string" ? stored.selectedLessonId : "",
  };
}

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

export function selectLesson(workspace: TeacherWorkspace, selectedLessonId: string) {
  return { ...workspace, selectedLessonId };
}

export function selectClass(workspace: TeacherWorkspace, selectedClass: string) {
  return { ...workspace, selectedClass, selectedLessonId: "" };
}

export function useTeacherWorkspace() {
  const [workspace, setWorkspaceState] = useState<TeacherWorkspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TEACHER_WORKSPACE_KEY);
      if (stored) setWorkspaceState(normalizeTeacherWorkspace(JSON.parse(stored)));
    } catch {}
    setReady(true);
  }, []);

  const setWorkspace = useCallback((nextWorkspace: TeacherWorkspace) => {
    setWorkspaceState(nextWorkspace);
    try {
      window.localStorage.setItem(TEACHER_WORKSPACE_KEY, JSON.stringify(nextWorkspace));
    } catch {}
  }, []);

  const setSelectedLessonId = useCallback((selectedLessonId: string) => {
    setWorkspaceState((current) => {
      const nextWorkspace = selectLesson(current, selectedLessonId);
      try {
        window.localStorage.setItem(
          TEACHER_WORKSPACE_KEY,
          JSON.stringify(nextWorkspace),
        );
      } catch {}
      return nextWorkspace;
    });
  }, []);

  return { workspace, ready, setWorkspace, setSelectedLessonId };
}
