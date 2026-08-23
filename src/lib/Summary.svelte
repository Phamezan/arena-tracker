<script lang="ts">
  import { app } from "./store.svelte";

  const cards = $derived.by(() => {
    const totalChamps = app.champions.length;
    const everyoneCount = app.champions.filter((c) =>
      app.players.every((p) => p.championsById.get(c.id))
    ).length;
    const nobodyCount = app.champions.filter((c) =>
      app.players.every((p) => !p.championsById.get(c.id))
    ).length;

    return [
      { label: "Champions", value: totalChamps },
      { label: "Players", value: app.players.length },
      { label: "Everyone has", value: everyoneCount },
      { label: "Nobody has", value: nobodyCount },
    ];
  });
</script>

<div id="summary">
  {#each cards as card}
    <div class="summary-card">
      <div class="value">{card.value}</div>
      <div class="label">{card.label}</div>
    </div>
  {/each}
</div>
