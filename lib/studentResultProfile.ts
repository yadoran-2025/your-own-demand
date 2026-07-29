import { isBeforeAnnualCutoff } from "./retention";
import type { StudentProfile } from "./types";

export const STUDENT_RESULT_PROFILE_KEY = "demand-app-student-result-profile";
const STUDENT_SUBMISSION_KEY_PREFIX = "demand-app-student-submission";

function buildStudentSubmissionKey(roomName: string, surveyId: string) {
  return [
    STUDENT_SUBMISSION_KEY_PREFIX,
    encodeURIComponent(roomName.trim()),
    encodeURIComponent(surveyId),
  ].join(":");
}

export function buildStudentResultHref(
  href: string,
  profile: Pick<StudentProfile, "grade" | "class_number">,
) {
  const [path, hash = ""] = href.split("#");
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);

  params.set("grade", String(profile.grade));
  params.set("classNumber", String(profile.class_number));

  const nextQuery = params.toString();
  return `${base}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
}

export function readStoredStudentResultProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  purgeExpiredStudentStorage();

  const raw = window.localStorage.getItem(STUDENT_RESULT_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { profile?: Partial<StudentProfile> };
    const profile = parsed.profile;
    if (!profile) {
      window.localStorage.removeItem(STUDENT_RESULT_PROFILE_KEY);
      return null;
    }
    const grade = Number(profile.grade);
    const classNumber = Number(profile.class_number);
    const studentNumber = Number(profile.student_number);
    const studentName =
      typeof profile.student_name === "string" ? profile.student_name.trim() : "";

    if (!Number.isInteger(grade) || !Number.isInteger(classNumber)) {
      window.localStorage.removeItem(STUDENT_RESULT_PROFILE_KEY);
      return null;
    }

    return {
      grade,
      classNumber,
      studentNumber: Number.isInteger(studentNumber) ? studentNumber : null,
      studentName,
    };
  } catch {
    return null;
  }
}

export function writeStoredStudentResultProfile(profile: StudentProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STUDENT_RESULT_PROFILE_KEY,
    JSON.stringify({
      profile,
      stored_at: new Date().toISOString(),
    }),
  );
}

export function writeStoredStudentSubmission(
  roomName: string,
  surveyId: string,
  profile: StudentProfile,
  responseId?: string,
) {
  if (typeof window === "undefined" || !roomName.trim() || !surveyId) {
    return;
  }

  window.localStorage.setItem(
    buildStudentSubmissionKey(roomName, surveyId),
    JSON.stringify({
      profile,
      response_id: responseId ?? null,
      submitted_at: new Date().toISOString(),
    }),
  );
}

export function readStoredStudentSubmission(roomName: string, surveyId: string) {
  if (typeof window === "undefined" || !roomName.trim() || !surveyId) {
    return null;
  }

  purgeExpiredStudentStorage();

  const key = buildStudentSubmissionKey(roomName, surveyId);
  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      profile?: StudentProfile;
      response_id?: string | null;
      submitted_at?: string;
    };
    if (
      !parsed.profile ||
      !Number.isInteger(parsed.profile.grade) ||
      !Number.isInteger(parsed.profile.class_number) ||
      !Number.isInteger(parsed.profile.student_number) ||
      typeof parsed.profile.student_name !== "string"
    ) {
      window.localStorage.removeItem(key);
      return null;
    }

    return {
      profile: parsed.profile,
      responseId: parsed.response_id ?? null,
      submittedAt: parsed.submitted_at ?? null,
    };
  } catch {
    return null;
  }
}

export function hasStoredStudentSubmission(roomName: string, surveyId: string) {
  return Boolean(readStoredStudentSubmission(roomName, surveyId));
}

export function purgeExpiredStudentStorage(now = new Date()) {
  if (typeof window === "undefined") {
    return;
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (
      key !== STUDENT_RESULT_PROFILE_KEY &&
      !key?.startsWith(`${STUDENT_SUBMISSION_KEY_PREFIX}:`)
    ) {
      continue;
    }

    const raw = key ? window.localStorage.getItem(key) : null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      const timestamp =
        key === STUDENT_RESULT_PROFILE_KEY
          ? parsed?.stored_at
          : parsed?.submitted_at;
      if (
        typeof timestamp !== "string" ||
        !Number.isFinite(new Date(timestamp).getTime()) ||
        isBeforeAnnualCutoff(timestamp, now)
      ) {
        window.localStorage.removeItem(key!);
      }
    } catch {
      window.localStorage.removeItem(key!);
    }
  }
}
