<script lang="ts">
  import { app } from "./store.svelte";
  import { championIconUrl } from "./data";
  import type { Champion, Player } from "./types";

  let { champ, done }: { champ: Champion; done: boolean } = $props();

  const RANK_ORDER: Record<string, number> = { "rank-gold": 0, "rank-silver": 1, "rank-bronze": 2 };
  const ROTATIONS = ["-10deg", "0deg", "10deg"];

  const doneFriends = $derived(
    app.players
      .filter((p) => p.championsById.get(champ.id) && p.avatar)
      .sort((a, b) => (RANK_ORDER[a.rankClass ?? ""] ?? 3) - (RANK_ORDER[b.rankClass ?? ""] ?? 3))
  );

  const top3 = $derived(doneFriends.slice(0, 3));
  const overflowCount = $derived(Math.max(0, doneFriends.length - 3));

  function displayName(player: Player): string {
    return player.tag || player.summoner;
  }
</script>

{#snippet orbWrap(player: Player, extraClass = "", style = "")}
  <div
    class={`orb-wrap ${extraClass}`}
    style={style}
    title={`${player.tag || player.summoner} (${player.summoner})`}
  >
    <img
      class={`orb ${player.rankClass || "rank-default"}`}
      src={`assets/orbs/${player.avatar}`}
      alt={player.summoner}
      loading="lazy"
    />
    <span class="orb-label">{displayName(player)}</span>
  </div>
{/snippet}

<div class="champ-card" class:done>
  <img
    class="champ-icon"
    class:greyed={!done}
    src={championIconUrl(champ.id)}
    alt={champ.name}
    loading="lazy"
  />

  {#if done}
    <img
      class="check-mark"
      src="assets/em_rammus_ok.png"
      alt="won"
      title="Won"
      loading="lazy"
    />
  {/if}

  <div class="champ-name">{champ.name}</div>

  <div class="fan">
    {#each top3 as player, i (player.summoner)}
      {@render orbWrap(player, "fan-slot", `--rotate: ${ROTATIONS[i] ?? "0deg"}`)}
    {/each}
    {#if overflowCount > 0}
      <div class="orb-wrap orb-overflow fan-slot fan-overflow" style="--rotate: 0deg">
        <div class="orb orb-overflow-chip">+{overflowCount}</div>
        <div class="overflow-panel">
          {#each doneFriends as player (player.summoner)}
            {@render orbWrap(player)}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
