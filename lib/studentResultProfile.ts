import type { StudentProfile } from "./types";

export const STUDENT_RESULT_PROFILE_KEY = "demand-app-student-result-profile";

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

    if (!Number.isInteger(grade) || !Number.isInteger(classNumber)) {
      return null;
    }

    return {
      grade,
      classNumber,
    };
  } catch {
    return null;
  }
}
