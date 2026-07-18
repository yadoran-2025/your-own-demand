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

  const raw = window.localStorage.getItem(STUDENT_RESULT_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const profile = JSON.parse(raw) as Partial<StudentProfile>;
    const grade = Number(profile.grade);
    const classNumber = Number(profile.class_number);
    const studentNumber = Number(profile.student_number);
    const studentName =
      typeof profile.student_name === "string" ? profile.student_name.trim() : "";

    if (!Number.isInteger(grade) || !Number.isInteger(classNumber)) {
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

  const raw = window.localStorage.getItem(buildStudentSubmissionKey(roomName, surveyId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      profile?: StudentProfile;
      response_id?: string | null;
      submitted_at?: string;
    };

    return {
      profile: parsed.profile ?? null,
      responseId: parsed.response_id ?? null,
      submittedAt: parsed.submitted_at ?? null,
    };
  } catch {
    return null;
  }
}

export function hasStoredStudentSubmission(roomName: string, surveyId: string) {
  if (typeof window === "undefined" || !roomName.trim() || !surveyId) {
    return false;
  }

  return Boolean(
    window.localStorage.getItem(buildStudentSubmissionKey(roomName, surveyId)),
  );
}
