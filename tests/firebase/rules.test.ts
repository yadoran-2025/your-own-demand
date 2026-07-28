import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "inflation-2e38b",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("Firestore rules", () => {
  it("denies anonymous and authenticated direct access", async () => {
    const anonymous = env.unauthenticatedContext().firestore();
    const student = env.authenticatedContext("student-1").firestore();

    await assertFails(getDoc(doc(anonymous, "rooms/room-1")));
    await assertFails(setDoc(doc(student, "rooms/room-1"), { name: "경제" }));
  });
});
