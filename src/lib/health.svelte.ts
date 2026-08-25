import { UNREACHABLE, configuredHealthUrl, POLL_MS, type Health } from "./health";

export const health = $state({ latest: null as Health | null });

/** Live socket pushes land here; the poll below is the fallback when it is down. */
export function applyHealth(next: Health) {
  health.latest = next;
}

/** Polls the Worker's health endpoint. Returns a stop function. */
export function startHealthWatch(): () => void {
  const url = configuredHealthUrl();
  if (!url) return () => {};

  const refresh = async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Health check returned ${response.status}`);
      health.latest = (await response.json()) as Health;
    } catch (err) {
      // Failing to reach the Worker is itself part of the signal, so surface
      // the gap rather than leaving a stale "all good" on screen.
      console.warn("Could not read tracker health", err);
      health.latest = UNREACHABLE;
    }
  };

  refresh();
  const timer = window.setInterval(refresh, POLL_MS);
  return () => window.clearInterval(timer);
}
