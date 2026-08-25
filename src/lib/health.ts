/**
 * Watcher health, ported from the pre-Svelte js/health.js.
 *
 * The banner exists because a dead poller looks exactly like a quiet night:
 * the board keeps rendering the last good data and nobody notices wins have
 * stopped landing. Each branch names the component at fault, so the message
 * points somewhere rather than just saying something is wrong.
 */

const HEALTH_URL_META_NAME = "arena-tracker-health-url";
export const POLL_MS = 60_000;
// A heartbeat is only "missing" once several poll cycles have gone by, so a
// single slow cycle does not flash the banner.
const MISSED_HEARTBEATS = 3;
const FALLBACK_STALE_MS = 15 * 60_000;

export interface Health {
  status?: string;
  error?: string | null;
  playersChecked?: number;
  playersFailed?: number;
  pollIntervalSeconds?: number;
  checkedAt?: string;
  /** "We could not ask", which is a different fault from "no heartbeat yet". */
  unreachable?: boolean;
}

export const UNREACHABLE: Health = { unreachable: true };

export function configuredHealthUrl(): string | undefined {
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${HEALTH_URL_META_NAME}"]`);
  return meta?.content.trim() || undefined;
}

function staleAfterMs(health: Health | null): number {
  const interval = Number(health?.pollIntervalSeconds);
  return interval > 0 ? interval * MISSED_HEARTBEATS * 1_000 : FALLBACK_STALE_MS;
}

function minutesSince(then: number, now: number): number {
  return Math.max(0, Math.round((now - then) / 60_000));
}

/** Banner text, or null when everything is fine. */
export function describeHealth(health: Health | null, now: number = Date.now()): string | null {
  if (health?.unreachable) {
    return "Cannot reach the tracker's sync service, so its status is unknown. Recent wins may be missing.";
  }

  if (!health?.checkedAt) {
    return "The tracker has not reported in yet. Wins may be missing until it reconnects.";
  }

  const checkedAt = new Date(health.checkedAt).getTime();
  if (!Number.isFinite(checkedAt)) {
    return "The tracker sent an unreadable status. Wins may be missing.";
  }

  if (now - checkedAt > staleAfterMs(health)) {
    return `The tracker last checked in ${minutesSince(checkedAt, now)} min ago and looks stopped. Wins may be missing.`;
  }

  if (health.status === "startup-failed") {
    return `The tracker failed to start, so no wins are being recorded.${health.error ? ` (${health.error})` : ""}`;
  }

  if (health.status === "down") {
    return `The tracker cannot reach the Riot API, so wins are not being recorded.${health.error ? ` (${health.error})` : ""}`;
  }

  if (health.status === "degraded") {
    const failed = health.playersFailed || 0;
    return `The tracker failed to check ${failed} player${failed === 1 ? "" : "s"} on its last pass, so some wins may be missing.${health.error ? ` (${health.error})` : ""}`;
  }

  return null;
}
