import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Header = { key: string; value: string };
type VercelConfig = { headers: Array<{ source: string; headers: Header[] }> };

const expectedCsp = {
  "default-src": "'self'",
  "script-src": "'self' 'unsafe-inline'",
  "style-src": "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src": "'self' https://cdn.jsdelivr.net data:",
  "img-src": "'self' data: blob:",
  "connect-src": "'self' https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com",
  "frame-src": "'self' https://inflation-2e38b.firebaseapp.com",
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
};

function readVercel() {
  return JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;
}

function parseCsp(value: string) {
  const directives = new Map<string, string>();
  for (const directive of value.split(";")) {
    const trimmed = directive.trim();
    const separator = trimmed.indexOf(" ");
    if (separator < 1) throw new Error(`Malformed CSP directive: ${trimmed}`);

    const name = trimmed.slice(0, separator);
    if (directives.has(name)) throw new Error(`Duplicate CSP directive: ${name}`);
    directives.set(name, trimmed.slice(separator + 1));
  }
  return directives;
}

describe("deployment configuration", () => {
  it("has exact Firebase CSP directives and security headers", () => {
    const rawVercel = readFileSync("vercel.json", "utf8");
    const vercel = readVercel();
    expect(rawVercel).not.toContain("supabase.co");
    expect(vercel.headers).toHaveLength(1);
    expect(vercel.headers[0]?.source).toBe("/(.*)");

    const headers = vercel.headers[0]?.headers ?? [];
    const cspHeaders = headers.filter(
      (header) => header.key === "Content-Security-Policy",
    );
    expect(cspHeaders).toHaveLength(1);

    const directives = parseCsp(cspHeaders[0]?.value ?? "");
    expect(Object.fromEntries(directives)).toEqual(expectedCsp);

    expect(headers.filter((header) => header.key !== "Content-Security-Policy")).toEqual([
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ]);
  });

  it("rejects duplicate CSP directives", () => {
    expect(() => parseCsp("default-src 'self'; default-src https://example.com")).toThrow(
      "Duplicate CSP directive: default-src",
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
