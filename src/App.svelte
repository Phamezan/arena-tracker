<script lang="ts">
  import { onMount } from "svelte";
  import { app } from "./lib/store.svelte";
  import { loadDocuments, applyLiveWin, assignRankClasses } from "./lib/data";
  import { startLiveUpdates } from "./lib/live";
  import { fetchRecentWins, addLiveWin } from "./lib/wins.svelte";
  import { restoreControls } from "./lib/store.svelte";
  import Leaderboard from "./lib/Leaderboard.svelte";
  import Summary from "./lib/Summary.svelte";
  import Grid from "./lib/Grid.svelte";
  import WinBanner from "./lib/WinBanner.svelte";
  import Controls from "./lib/Controls.svelte";
  import type { LiveWinMessage } from "./lib/types";

  async function refreshData() {
    const { players, champions } = await loadDocuments();
    app.players = players;
    app.champions = champions;
    assignRankClasses(app.players);
    restoreControls(app.players.map((p) => p.summoner));
  }

  function handleLiveWin(message: LiveWinMessage) {
    if (!applyLiveWin(message)) {
      // A newly added player needs the complete static document, not just a win.
      refreshData().catch((err) => console.warn("Could not refresh after live update", err));
      return;
    }
    addLiveWin(message.win);
  }

  onMount(() => {
    (async () => {
      try {
        await Promise.all([refreshData(), fetchRecentWins()]);
        app.ready = true;
        startLiveUpdates({
          onWin: handleLiveWin,
          onVisible: () => refreshData().catch((err) => console.warn("Could not refresh dashboard", err)),
        });
      } catch (err) {
        app.error = err instanceof Error ? err.message : String(err);
        console.error(err);
      }
    })();
  });
</script>

<header>
  <h1>Alabama Tracker</h1>
</header>

<main>
  {#if !app.ready && !app.error}
    <div id="status">Loading data...</div>
  {:else if app.error}
    <div id="status" class="error">{app.error}</div>
  {:else}
    <WinBanner />
    <Leaderboard />
    <Controls />
    <Summary />
    <Grid />
  {/if}
</main>
