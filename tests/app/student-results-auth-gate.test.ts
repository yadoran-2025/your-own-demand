import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/student/results/page.tsx", "utf8");

describe("student results remote-load contract", () => {
  it("waits for AuthProvider before every results API trigger", () => {
    expect(source).toMatch(
      /import\s+\{\s*useAuth\s*\}\s+from\s+"@\/components\/AuthProvider"/,
    );
    expect(source).toMatch(
      /const\s+\{\s*ready:\s*authReady,\s*user,\s*demoMode\s*\}\s*=\s*useAuth\(\);/,
    );
    expect(source).toMatch(
      /const\s+canLoad\s*=\s*canLoadStudentData\(\{[\s\S]*authReady,[\s\S]*authenticated:\s*Boolean\(user\),[\s\S]*demoMode,[\s\S]*\}\);/,
    );
    expect(source).toMatch(
      /const\s+loadSurveys\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{\s*if\s*\(!canLoad\)\s*\{\s*return;/,
    );
    expect(source).toMatch(
      /const\s+loadResponses\s*=\s*useCallback\(async\s*\(surveyId:\s*string\)\s*=>\s*\{\s*if\s*\(!canLoad\s*\|\|\s*!surveyId\)\s*\{/,
    );
    expect(source).toMatch(
      /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(canLoad\)\s*\{\s*void\s+loadSurveys\(\);\s*\}\s*\},\s*\[canLoad,\s*loadSurveys\]\);/,
    );
    expect(source).toMatch(
      /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(canLoad\)\s*\{\s*void\s+loadResponses\(selectedSurvey\?\.id\s*\?\?\s*""\);\s*\}\s*\},\s*\[canLoad,\s*loadResponses,\s*selectedSurvey\?\.id\]\);/,
    );
  });

  it("does not use query-string grade or class as an identity authorization claim", () => {
    expect(source).not.toContain("viewerGrade");
    expect(source).not.toContain("viewerClassNumber");
    expect(source).toContain("fetchResponses(");
  });
});
