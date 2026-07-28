import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("deployment configuration", () => {
  it("contains Firebase Auth origins and no Supabase origins", () => {
    const vercel = readFileSync("vercel.json", "utf8");
    expect(vercel).not.toContain("supabase.co");
    expect(vercel).toContain("https://*.googleapis.com");
    expect(vercel).toContain("https://*.firebaseapp.com");
  });

  it("documents Firebase and Vercel instead of Supabase and GitHub Pages", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    expect(privacy).toContain("Firebase");
    expect(privacy).toContain("Vercel");
    expect(privacy).not.toContain("Supabase");
    expect(privacy).not.toContain("GitHub Pages");
  });
});
