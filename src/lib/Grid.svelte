<script lang="ts">
  import { app, controls } from "./store.svelte";
  import ChampCard from "./ChampCard.svelte";
  import type { Champion, Player } from "./types";

  const RANK_ORDER: Record<string, number> = { "rank-gold": 0, "rank-silver": 1, "rank-bronze": 2 };

  interface Card {
    champ: Champion;
    done: boolean;
  }

  // Not persisted (matches original behavior).
  let onlyMissing = $state(false);

  function isChampionDoneForFocus(champId: number, focus: string): boolean {
    const player = app.players.find((p) => p.summoner === focus);
    return player ? !!player.championsById.get(champId) : false;
  }

  function doneFriendsFor(champId: number): Player[] {
    return app.players
      .filter((p) => p.championsById.get(champId) && p.avatar)
      .sort((a, b) => (RANK_ORDER[a.rankClass ?? ""] ?? 3) - (RANK_ORDER[b.rankClass ?? ""] ?? 3));
  }

  const filtered = $derived.by(() => {
    const query = controls.search.trim().toLowerCase();
    const result: Card[] = [];
    for (const champ of app.champions) {
      if (query && !champ.name.toLowerCase().includes(query)) continue;

      const nobodyHas = app.players.every((p) => !p.championsById.get(champ.id));
      if (onlyMissing && !nobodyHas) continue;

      result.push({ champ, done: isChampionDoneForFocus(champ.id, controls.focus) });
    }
    return result;
  });

  const wins = $derived(filtered.filter((c) => c.done));
  const missing = $derived(filtered.filter((c) => !c.done));
</script>

<div id="gridWrap">
  <div id="grid" class:hide-icons={controls.hideIcons}>
    {#if !controls.groupByWins}
      <div class="champ-grid">
        {#each filtered as { champ, done } (champ.id)}
          <ChampCard {champ} {done} />
        {/each}
      </div>
    {:else}
      <div class="grid-columns">
        <div class="grid-column">
          <h3 class="grid-section-heading">Missing ({missing.length})</h3>
          <div class="champ-grid">
            {#each missing as { champ, done } (champ.id)}
              <ChampCard {champ} {done} />
            {/each}
          </div>
        </div>
        <div class="grid-column">
          <h3 class="grid-section-heading">Wins ({wins.length})</h3>
          <div class="champ-grid">
            {#each wins as { champ, done } (champ.id)}
              <ChampCard {champ} {done} />
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
