import { expect, it, vi } from "vitest";
import { applyAuthState } from "@/lib/auth-state";

it("clears stale teacher state and starts anonymous auth exactly once", async () => {
  const setUser = vi.fn();
  const setReady = vi.fn();
  const signInGuest = vi.fn().mockResolvedValue(undefined);
  await applyAuthState(null, { setReady, setUser, signInGuest });
  expect(setUser).toHaveBeenCalledWith(null);
  expect(setReady).toHaveBeenCalledWith(false);
  expect(signInGuest).toHaveBeenCalledTimes(1);
});

it("marks a resolved Firebase user ready without anonymous auth", async () => {
  const user = { isAnonymous: false };
  const setUser = vi.fn();
  const setReady = vi.fn();
  const signInGuest = vi.fn();
  await applyAuthState(user, { setReady, setUser, signInGuest });
  expect(setUser).toHaveBeenCalledWith(user);
  expect(setReady).toHaveBeenCalledWith(true);
  expect(signInGuest).not.toHaveBeenCalled();
});
