<script lang="ts">
  import { app, controls, setFocus } from "./store.svelte";
  import { winCount } from "./data";
</script>

<div id="leaderboard">
  {#each [...app.players]
      .map((p) => ({ summoner: p.summoner, rankClass: p.rankClass, wins: winCount(p) }))
      .sort((a, b) => b.wins - a.wins) as entry, index}
    <button
      type="button"
      class="leaderboard-item {entry.rankClass ?? ''}"
      title={`Grey the grid based on ${entry.summoner}`}
      onclick={() => {
        if (controls.focus !== entry.summoner) setFocus(entry.summoner);
      }}
    >
      {#if index === 0}<span class="leaderboard-crown">👑</span>{/if}
      <span class="leaderboard-name">{entry.summoner}</span>
      <span class="leaderboard-wins">{entry.wins}</span>
    </button>
  {/each}
</div>
