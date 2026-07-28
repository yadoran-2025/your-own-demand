import { afterEach, describe, expect, it, vi } from "vitest";
import { startPolling } from "@/lib/polling";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  it("does not overlap async callbacks, reports errors, and keeps polling", async () => {
    vi.useFakeTimers();
    let resolve!: () => void;
    const error = new Error("network failed");
    const onError = vi.fn();
    const callback = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () => new Promise<void>((done) => {
          resolve = done;
        }),
      )
      .mockRejectedValueOnce(error);
    const stop = startPolling(callback, { intervalMs: 100, onError });

    await vi.advanceTimersByTimeAsync(300);
    expect(callback).toHaveBeenCalledTimes(1);

    resolve();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);

    await vi.advanceTimersByTimeAsync(100);
    expect(callback).toHaveBeenCalledTimes(3);
    stop();
  });

  it("reports synchronous errors to console by default", async () => {
    vi.useFakeTimers();
    const error = new Error("sync failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stop = startPolling(() => {
      throw error;
    }, { intervalMs: 100 });

    await vi.advanceTimersByTimeAsync(100);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith("Polling callback failed", error);
    stop();
  });

  it("stops pending callbacks without scheduling another poll", async () => {
    vi.useFakeTimers();
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const onError = vi.fn();
    const resolvedCallback = vi.fn(
      () => new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const rejectedCallback = vi.fn(
      () => new Promise<void>((_done, fail) => {
        reject = fail;
      }),
    );
    const stopResolved = startPolling(resolvedCallback, { intervalMs: 100, onError });

    await vi.advanceTimersByTimeAsync(100);
    stopResolved();
    resolve();
    await vi.advanceTimersByTimeAsync(300);
    expect(resolvedCallback).toHaveBeenCalledExactlyOnceWith();

    const stopRejected = startPolling(rejectedCallback, { intervalMs: 100, onError });
    await vi.advanceTimersByTimeAsync(100);
    stopRejected();
    const error = new Error("stopped failure");
    reject(error);
    await vi.advanceTimersByTimeAsync(300);
    expect(rejectedCallback).toHaveBeenCalledExactlyOnceWith();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("stops idempotently", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = startPolling(callback, { intervalMs: 100 });

    stop();
    stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(callback).not.toHaveBeenCalled();
  });
});
