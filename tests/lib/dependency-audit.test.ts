import { describe, expect, it } from "vitest";
import {
  collectAdvisories,
  compareAudit,
} from "@/scripts/check-dependency-audit.mjs";

const known = {
  advisories: [
    {
      url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
      severity: "high",
    },
  ],
};

describe("dependency audit regression", () => {
  it("accepts only recorded production advisories", () => {
    const report = {
      vulnerabilities: {
        sharp: {
          via: [{
            url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
            severity: "high",
          }],
        },
      },
    };
    expect(compareAudit(report, known)).toEqual({
      accepted: ["https://github.com/advisories/GHSA-f88m-g3jw-g9cj"],
      critical: [],
      introduced: [],
      ok: true,
    });
  });

  it("rejects a new advisory and every critical advisory", () => {
    const report = {
      vulnerabilities: {
        packageA: {
          via: [
            {
              url: "https://github.com/advisories/GHSA-new1-new2-new3",
              severity: "high",
            },
            {
              url: "https://github.com/advisories/GHSA-crit-ical-risk",
              severity: "critical",
            },
          ],
        },
      },
    };
    expect(collectAdvisories(report)).toHaveLength(2);
    expect(compareAudit(report, known)).toMatchObject({
      critical: ["https://github.com/advisories/GHSA-crit-ical-risk"],
      introduced: [
        "https://github.com/advisories/GHSA-crit-ical-risk",
        "https://github.com/advisories/GHSA-new1-new2-new3",
      ],
      ok: false,
    });
  });
});
