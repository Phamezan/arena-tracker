import type { LiveWinMessage } from "./types";

const LIVE_URL_META_NAME = "arena-tracker-live-url";
const RECONNECT_MAX_MS = 30_000;

function configuredLiveUrl(): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[name="${LIVE_URL_META_NAME}"]`)?.content.trim();
}

interface LiveCallbacks {
  onWin: (message: LiveWinMessage) => void;
  onHealth?: (health: unknown) => void;
  onVisible: () => void;
}

/** Connect to the Worker-owned, read-only update stream. Returns a stop function. */
export function startLiveUpdates({ onWin, onHealth, onVisible }: LiveCallbacks): () => void {
  const url = configuredLiveUrl();
  if (!url) return () => {};

  let socket: WebSocket | undefined;
  let retryTimer: number | undefined;
  let attempts = 0;
  let stopped = false;

  const reconnect = () => {
    if (stopped || retryTimer !== undefined) return;
    const delay = Math.min(1_000 * 2 ** attempts, RECONNECT_MAX_MS);
    attempts += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, delay);
  };

  const connect = () => {
    if (stopped || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      console.warn("Could not open live updates", err);
      reconnect();
      return;
    }

    socket.addEventListener("open", () => { attempts = 0; });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data as string);
        if (message?.type === "win" && message.win && message.champion) onWin(message as LiveWinMessage);
        if (message?.type === "health" && message.health) onHealth?.(message.health);
      } catch (err) {
        console.warn("Ignored malformed live update", err);
      }
    });
    socket.addEventListener("close", reconnect);
    socket.addEventListener("error", () => socket?.close());
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      onVisible();
      connect();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  connect();

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    socket?.close();
  };
}
