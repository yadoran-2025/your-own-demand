import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("Next runtime", () => {
  it("does not use a static export or GitHub Pages base path", () => {
    expect(nextConfig.output).toBeUndefined();
    expect(nextConfig.basePath).toBeUndefined();
  });
});
