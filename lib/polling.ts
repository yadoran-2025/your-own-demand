export function startPolling(
  callback: () => void | Promise<void>,
  intervalMs = 2500,
) {
  let running = false;
  let stopped = false;

  const poll = () => {
    if (running || stopped) return;
    running = true;
    void Promise.resolve()
      .then(callback)
      .catch(() => undefined)
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
