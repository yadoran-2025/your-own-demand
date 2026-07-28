import { afterEach, describe, expect, it, vi } from "vitest";
import { startPolling } from "@/lib/polling";

afterEach(() => vi.useRealTimers());

describe("startPolling", () => {
  it("runs every 2500 ms and stops cleanly", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = startPolling(callback);

    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(2500);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("does not overlap async callbacks and ignores rejected callbacks", async () => {
    vi.useFakeTimers();
    let resolve!: () => void;
    const callback = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () => new Promise<void>((done) => {
          resolve = done;
        }),
      )
      .mockRejectedValueOnce(new Error("network failed"));
    const stop = startPolling(callback, 100);

    await vi.advanceTimersByTimeAsync(300);
    expect(callback).toHaveBeenCalledTimes(1);

    resolve();
    await vi.advanceTimersByTimeAsync(100);
    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(100);
    expect(callback).toHaveBeenCalledTimes(3);
    stop();
  });

  it("stops idempotently", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = startPolling(callback, 100);

    stop();
    stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(callback).not.toHaveBeenCalled();
  });
});
