"use client";

import { useEffect, useState } from "react";

export const TEACHER_ROOM_KEY = "demand-app-teacher-room";
export const STUDENT_ROOM_KEY = "demand-app-student-room";

const LEGACY_STORAGE_KEYS: Record<string, string> = {
  [TEACHER_ROOM_KEY]: "demand-app-teacher-pin",
  [STUDENT_ROOM_KEY]: "demand-app-student-pin",
};

export function normalizeRoomName(roomName: string) {
  return roomName.trim();
}

export function buildStudentPath(roomName: string, surveyId = "") {
  const normalizedRoomName = normalizeRoomName(roomName);
  if (!normalizedRoomName) return "/student";

  const normalizedSurveyId = surveyId.trim();
  const surveyParam = normalizedSurveyId
    ? `&survey=${encodeURIComponent(normalizedSurveyId)}`
    : "";
  return `/student?room=${encodeURIComponent(normalizedRoomName)}${surveyParam}`;
}

export function resolveSurveyId(
  surveyIds: string[],
  requestedSurveyId: string,
  currentSurveyId = "",
) {
  if (surveyIds.includes(requestedSurveyId)) return requestedSurveyId;
  if (surveyIds.includes(currentSurveyId)) return currentSurveyId;
  return surveyIds[0] ?? "";
}

export function useStoredRoomName(storageKey: string) {
  const [roomName, setRoomNameState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRoomName = normalizeRoomName(
      params.get("room") ?? params.get("pin") ?? "",
    );
    const storedRoomName = normalizeRoomName(
      window.localStorage.getItem(storageKey) ??
        window.localStorage.getItem(LEGACY_STORAGE_KEYS[storageKey] ?? "") ??
        "",
    );
    const nextRoomName = queryRoomName || storedRoomName;

    if (nextRoomName) {
      window.localStorage.setItem(storageKey, nextRoomName);
    }

    setRoomNameState(nextRoomName);
    setReady(true);
  }, [storageKey]);

  function setRoomName(nextRoomName: string) {
    const normalizedRoomName = normalizeRoomName(nextRoomName);
    setRoomNameState(normalizedRoomName);

    if (normalizedRoomName) {
      window.localStorage.setItem(storageKey, normalizedRoomName);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }

  return { roomName, ready, setRoomName };
}
