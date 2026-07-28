type PollingOptions = {
  intervalMs?: number;
  onError?: (error: unknown) => void | Promise<void>;
};

export function startPolling(
  callback: () => void | Promise<void>,
  { intervalMs = 2500, onError = defaultOnError }: PollingOptions = {},
) {
  let running = false;
  let stopped = false;

  const poll = () => {
    if (running || stopped) return;
    running = true;
    void Promise.resolve()
      .then(() => callback())
      .catch(async (error: unknown) => {
        try {
          await onError(error);
        } catch (reportError) {
          safeConsoleError("Polling error reporter failed", reportError);
        }
      })
      .finally(() => {
        running = false;
      });
  };
  const timer = globalThis.setInterval(poll, intervalMs);

  return () => {
    stopped = true;
    globalThis.clearInterval(timer);
  };
}

function defaultOnError(error: unknown) {
  safeConsoleError("Polling callback failed", error);
}

function safeConsoleError(...args: unknown[]) {
  try {
    console.error(...args);
  } catch {
    // Logging must not turn a handled polling failure into an unhandled rejection.
  }
}
