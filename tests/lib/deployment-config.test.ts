import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Header = { key: string; value: string };
type VercelConfig = {
  headers: Array<{ source: string; headers: Header[] }>;
  crons: Array<{ path: string; schedule: string }>;
  regions: string[];
};

const expectedCsp = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://apis.google.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
  "font-src": ["'self'", "https://cdn.jsdelivr.net", "data:"],
  "img-src": ["'self'", "data:", "blob:"],
  "connect-src": ["'self'", "https://*.googleapis.com", "https://*.firebaseapp.com", "https://securetoken.googleapis.com"],
  "frame-src": ["'self'", "https://inflation-2e38b.firebaseapp.com"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
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

function allowsExternalScript(directives: Map<string, string>, resource: string) {
  const origin = new URL(resource).origin;
  return (directives.get("script-src") ?? "").split(/\s+/).includes(origin);
}

describe("deployment configuration", () => {
  it("runs server functions beside the Seoul Firestore database", () => {
    expect(readVercel().regions).toEqual(["icn1"]);
  });

  it("allows Firebase Google popup bootstrap while retaining script restrictions", () => {
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
    expect(Object.keys(Object.fromEntries(directives)).sort()).toEqual(
      Object.keys(expectedCsp).sort(),
    );
    for (const [name, sources] of Object.entries(expectedCsp)) {
      expect((directives.get(name) ?? "").split(/\s+/).sort()).toEqual(sources.sort());
    }
    expect(
      allowsExternalScript(directives, "https://apis.google.com/js/api.js"),
    ).toBe(true);
    expect(
      allowsExternalScript(directives, "https://untrusted.example/script.js"),
    ).toBe(false);
    expect(directives.get("frame-ancestors")).toBe("'none'");
    expect(directives.get("object-src")).toBe("'none'");

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

  it("uses a Vercel origin and root-relative legal routes", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const env = readFileSync(".env.example", "utf8");

    expect(layout).toContain("process.env.NEXT_PUBLIC_SITE_URL");
    expect(layout).toContain('href="/privacy/"');
    expect(layout).toContain('href="/terms/"');
    expect(layout).not.toContain("yadoran-2025.github.io");
    expect(layout).not.toContain("/your-own-demand/");
    expect(env).toContain(
      "NEXT_PUBLIC_SITE_URL=https://inflation-classroom.vercel.app",
    );
  });

  it("distinguishes Seoul storage from overseas processing", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");

    expect(privacy).toContain("asia-northeast3");
    expect(privacy).toContain("서울");
    expect(privacy).toContain("Firebase Authentication");
    expect(privacy).toContain("미국");
    expect(privacy).toContain("Vercel");
    expect(privacy).toContain("국외");
    expect(privacy).not.toContain("국외이전 없음");
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

  it("runs the annual student-data purge on February 1 KST", () => {
    const vercel = readVercel();
    expect(vercel.crons).toEqual([
      {
        path: "/api/cron/purge-student-data",
        schedule: "0 15 31 1 *",
      },
    ]);

    const env = readFileSync(".env.example", "utf8");
    expect(env).toContain("CRON_SECRET=");
  });

  it("documents identifiable student-data rules and annual destruction", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    const terms = readFileSync("app/terms/page.tsx", "utf8");
    const dorms = JSON.parse(
      readFileSync("dorms-check.config.json", "utf8"),
    ) as { edzipCase: string };

    expect(privacy).toContain("만 14세 미만에게는 제공하지 않습니다");
    expect(privacy).toContain("수업 참여 여부 확인");
    expect(privacy).toContain("같은 학년·반");
    expect(privacy).toContain("매년 2월 1일");
    expect(privacy).toContain("교사만 삭제");
    expect(privacy).toContain("Firebase");
    expect(privacy).toContain("Vercel");
    expect(terms).toContain("만 14세 이상");
    expect(terms).toContain("이름 또는 수업용 별명");
    expect(dorms.edzipCase).toBe("D");
  });
});
