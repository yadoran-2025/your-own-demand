import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("deployment configuration", () => {
  it("contains Firebase Auth origins and no Supabase origins", () => {
    const vercel = readFileSync("vercel.json", "utf8");
    expect(vercel).not.toContain("supabase.co");
    expect(vercel).toContain("https://*.googleapis.com");
    expect(vercel).toContain("https://*.firebaseapp.com");
    expect(vercel).toContain(
      "frame-src 'self' https://inflation-2e38b.firebaseapp.com",
    );
  });

  it("documents Firebase and Vercel instead of Supabase and GitHub Pages", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    expect(privacy).toContain("Firebase");
    expect(privacy).toContain("Vercel");
    expect(privacy).not.toContain("Supabase");
    expect(privacy).not.toContain("GitHub Pages");
  });

  it("routes local development and emulator tests safely", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("npx firebase-tools emulators:start --only firestore");
    expect(readme).toContain("export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
    expect(readme).toContain("firebase emulators:exec");
    expect(readme).toMatch(
      /production Admin SDK credentials[\s\S]{0,240}FIRESTORE_EMULATOR_HOST/,
    );
  });
});
