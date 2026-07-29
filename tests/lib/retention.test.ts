import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isBeforeAnnualCutoff,
  latestFebruaryFirstCutoff,
} from "@/lib/retention";

const values = new Map<string, string>();
const localStorage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key: string) {
    return values.get(key) ?? null;
  },
  key(index: number) {
    return Array.from(values.keys())[index] ?? null;
  },
  removeItem(key: string) {
    values.delete(key);
  },
  setItem(key: string, value: string) {
    values.set(key, value);
  },
};

beforeEach(() => {
  values.clear();
  vi.stubGlobal("window", { localStorage });
});

describe("annual student-data cutoff", () => {
  it("uses February 1 00:00 KST as the current cutoff", () => {
    expect(
      latestFebruaryFirstCutoff(
        new Date("2027-02-01T00:30:00+09:00"),
      ).toISOString(),
    ).toBe("2027-01-31T15:00:00.000Z");
  });

  it("uses the previous year's cutoff before February 1 KST", () => {
    expect(
      latestFebruaryFirstCutoff(
        new Date("2027-01-31T23:59:59+09:00"),
      ).toISOString(),
    ).toBe("2026-01-31T15:00:00.000Z");
  });

  it("expires only records strictly older than the cutoff", () => {
    const now = new Date("2027-02-01T00:30:00+09:00");
    expect(isBeforeAnnualCutoff("2027-01-31T14:59:59.999Z", now)).toBe(true);
    expect(isBeforeAnnualCutoff("2027-01-31T15:00:00.000Z", now)).toBe(false);
  });

  it("removes expired profile and submission copies but preserves current records", async () => {
    window.localStorage.setItem(
      "demand-app-student-result-profile",
      JSON.stringify({
        profile: {
          grade: 1,
          class_number: 1,
          student_number: 1,
          student_name: "지난학생",
        },
        stored_at: "2027-01-31T14:59:59.999Z",
      }),
    );
    window.localStorage.setItem(
      "demand-app-student-submission:room:survey-old",
      JSON.stringify({
        profile: {
          grade: 1,
          class_number: 1,
          student_number: 1,
          student_name: "지난학생",
        },
        submitted_at: "2027-01-31T14:59:59.999Z",
      }),
    );
    window.localStorage.setItem(
      "demand-app-student-submission:room:survey-current",
      JSON.stringify({
        profile: {
          grade: 1,
          class_number: 1,
          student_number: 1,
          student_name: "현재학생",
        },
        submitted_at: "2027-01-31T15:00:00.000Z",
      }),
    );

    const { purgeExpiredStudentStorage } = await import(
      "@/lib/studentResultProfile"
    );
    purgeExpiredStudentStorage(new Date("2027-02-01T00:30:00+09:00"));

    expect(
      window.localStorage.getItem("demand-app-student-result-profile"),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "demand-app-student-submission:room:survey-old",
      ),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "demand-app-student-submission:room:survey-current",
      ),
    ).not.toBeNull();
  });

  it("removes malformed timestamps and submissions with invalid profiles", async () => {
    window.localStorage.setItem(
      "demand-app-student-result-profile",
      JSON.stringify({ stored_at: "not-a-date" }),
    );
    window.localStorage.setItem(
      "demand-app-student-submission:room:survey-malformed-time",
      JSON.stringify({ submitted_at: "not-a-date" }),
    );
    window.localStorage.setItem(
      "demand-app-student-submission:room:survey-no-profile",
      JSON.stringify({
        profile: {},
        submitted_at: "2027-01-31T15:00:00.000Z",
      }),
    );

    const {
      purgeExpiredStudentStorage,
      readStoredStudentSubmission,
    } = await import("@/lib/studentResultProfile");
    purgeExpiredStudentStorage(new Date("2027-02-01T00:30:00+09:00"));

    expect(
      window.localStorage.getItem("demand-app-student-result-profile"),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "demand-app-student-submission:room:survey-malformed-time",
      ),
    ).toBeNull();
    expect(readStoredStudentSubmission("room", "survey-no-profile")).toBeNull();
  });
});
