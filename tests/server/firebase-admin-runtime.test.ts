import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("loads Firebase Admin's JWKS dependency through Vercel's CommonJS path", () => {
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "node@22.11.0",
      "-e",
      "const jwks = require('jwks-rsa'); jwks({ jwksUri: 'https://example.test/jwks' });",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  expect(result.status, result.stderr).toBe(0);
});
