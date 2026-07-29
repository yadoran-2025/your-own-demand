import { describe, expect, it } from "vitest";
import { canLoadStudentData } from "@/lib/student-data-load";

describe("student remote data gate", () => {
  it("blocks a persisted-room fetch until Firebase resolves an authenticated user", () => {
    expect(canLoadStudentData({
      roomReady: true,
      roomName: "경제 1반",
      authReady: false,
      authenticated: false,
      demoMode: false,
    })).toBe(false);
    expect(canLoadStudentData({
      roomReady: true,
      roomName: "경제 1반",
      authReady: true,
      authenticated: false,
      demoMode: false,
    })).toBe(false);
    expect(canLoadStudentData({
      roomReady: true,
      roomName: "경제 1반",
      authReady: true,
      authenticated: true,
      demoMode: false,
    })).toBe(true);
  });

  it("keeps local demo room loading available without Firebase auth", () => {
    expect(canLoadStudentData({
      roomReady: true,
      roomName: "경제 1반",
      authReady: false,
      authenticated: false,
      demoMode: true,
    })).toBe(true);
  });
});
