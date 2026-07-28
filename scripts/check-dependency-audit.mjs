import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function collectAdvisories(report) {
  const byUrl = new Map();
  const vulnerabilities = report.vulnerabilities ?? {};
  const visited = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const vulnerability = vulnerabilities[name];
    if (!vulnerability) {
      throw new Error(`Unrecognized npm audit reference: ${name}`);
    }
    if (!Array.isArray(vulnerability.via)) {
      throw new Error(`Unrecognized npm audit vulnerability entry: ${name}`);
    }
    for (const via of vulnerability.via) {
      if (typeof via === "string") {
        visit(via);
        continue;
      }
      if (!via?.url || !via?.severity) {
        throw new Error(
          `Unrecognized npm audit advisory entry: ${JSON.stringify(via)}`,
        );
      }
      byUrl.set(via.url, {
        severity: via.severity,
        url: via.url,
      });
    }
  }

  for (const name of Object.keys(vulnerabilities)) visit(name);

  return [...byUrl.values()].sort((left, right) =>
    left.url.localeCompare(right.url),
  );
}

export function compareAudit(report, baseline) {
  const allowed = new Set(baseline.advisories.map((item) => item.url));
  const advisories = collectAdvisories(report);
  const accepted = advisories
    .filter((item) => allowed.has(item.url))
    .map((item) => item.url);
  const introduced = advisories
    .filter((item) => !allowed.has(item.url))
    .map((item) => item.url);
  const critical = advisories
    .filter((item) => item.severity === "critical")
    .map((item) => item.url);
  return {
    accepted,
    critical,
    introduced,
    ok: introduced.length === 0 && critical.length === 0,
  };
}

async function main() {
  const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
  });
  if (!audit.stdout.trim()) {
    console.error(audit.stderr || "npm audit returned no JSON.");
    process.exit(2);
  }
  const report = JSON.parse(audit.stdout);
  const baseline = JSON.parse(
    await readFile(
      new URL("../docs/security/dependency-audit-baseline.json", import.meta.url),
      "utf8",
    ),
  );
  const result = compareAudit(report, baseline);
  console.log(
    `${result.accepted.length} accepted advisories; ` +
    `${result.introduced.length} new; ${result.critical.length} critical`,
  );
  if (!result.ok) {
    for (const url of result.introduced) console.error(`NEW ${url}`);
    for (const url of result.critical) console.error(`CRITICAL ${url}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
