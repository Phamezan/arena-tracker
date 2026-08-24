const HEALTH_URL_META_NAME = "arena-tracker-health-url";
const POLL_MS = 60_000;
// A heartbeat is only "missing" once several poll cycles have gone by, so a
// single slow cycle does not flash the banner.
const MISSED_HEARTBEATS = 3;
const FALLBACK_STALE_MS = 15 * 60_000;

function configuredHealthUrl() {
  return document.querySelector(`meta[name="${HEALTH_URL_META_NAME}"]`)?.content.trim();
}

function staleAfterMs(health) {
  const interval = Number(health?.pollIntervalSeconds);
  return interval > 0 ? interval * MISSED_HEARTBEATS * 1_000 : FALLBACK_STALE_MS;
}

function minutesSince(then, now) {
  return Math.max(0, Math.round((now - then) / 60_000));
}

export const UNREACHABLE = { unreachable: true };

/**
 * Turns a heartbeat into the banner text, or null when everything is fine.
 * A missing heartbeat is itself a problem: the watcher reports on every cycle.
 * Each branch names the component at fault, so the banner points somewhere.
 */
export function describeHealth(health, now = Date.now()) {
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

function render(bannerEl, health) {
  const message = describeHealth(health);
  bannerEl.textContent = message ?? "";
  bannerEl.classList.toggle("hidden", message === null);
}

/**
 * Watches the sync Worker's health endpoint and shows a banner whenever the
 * watcher is erroring or has gone quiet. Live "health" messages arrive over the
 * existing WebSocket; the poll is the fallback when that socket is down.
 */
export function startHealthWatch() {
  const bannerEl = document.getElementById("healthBanner");
  const url = configuredHealthUrl();
  if (!url || !bannerEl) return { applyHealth: () => {} };

  let latest = null;

  const refresh = async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Health check returned ${response.status}`);
      latest = await response.json();
    } catch (err) {
      // Reaching the Worker is itself part of the signal, so surface the gap
      // rather than leaving a stale "all good" banner state on screen.
      console.warn("Could not read tracker health", err);
      latest = UNREACHABLE;
    }
    render(bannerEl, latest);
  };

  refresh();
  // Re-render on the interval too: a heartbeat goes stale with no new events.
  window.setInterval(refresh, POLL_MS);

  return {
    applyHealth(health) {
      latest = health;
      render(bannerEl, latest);
    },
  };
}
