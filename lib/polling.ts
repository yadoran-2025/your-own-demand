type PollingOptions = {
  intervalMs?: number;
  onError?: (error: unknown) => void;
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
      .catch((error: unknown) => {
        try {
          onError(error);
        } catch (reportError) {
          console.error("Polling error reporter failed", reportError);
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
  console.error("Polling callback failed", error);
}
