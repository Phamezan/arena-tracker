<script lang="ts">
  import { onMount } from "svelte";
  import { app } from "./store.svelte";
  import { championIconUrl } from "./data";
  import {
    recentWins,
    loadDdragonVersion,
    ddragonVersion,
    relativeTime,
    playerDisplayName,
  } from "./wins.svelte";
  import type { Player, Win } from "./types";

  onMount(loadDdragonVersion);

  function playerBySummoner(summoner: string): Player | undefined {
    return app.players.find((p) => p.summoner === summoner);
  }

  function itemUrl(id: number): string {
    return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion()}/img/item/${id}.png`;
  }

  function gameEndTitle(win: Win): string {
    return new Date(win.gameEnd).toLocaleString();
  }
</script>

{#if recentWins().length}
  <div id="winBanner">
    <!-- Arena is 2v2v2v2, so one match can have several tracked winners and
         matchId is not unique. Key on the winner too, or Svelte throws
         each_key_duplicate and the whole board fails to render. -->
    {#each recentWins() as win (`${win.matchId ?? win.gameEnd}:${win.summoner}`)}
      {@const player = playerBySummoner(win.summoner)}
      <div class="win-card">
        <span class="win-card-ribbon">WIN</span>

        <img
          class="champ-icon"
          src={championIconUrl(win.championId)}
          alt=""
          loading="lazy"
        />

        <div class="win-card-body">
          <span class="win-card-name">
            {#if player?.avatar}
              <img
                class={`orb ${player.rankClass || "rank-default"}`}
                src={`assets/orbs/${player.avatar}`}
                alt=""
              />
            {/if}
            <span class="win-card-player">{playerDisplayName(win.summoner)}</span>
          </span>

          <span class="win-card-sub">
            <span title={gameEndTitle(win)}>{relativeTime(win.gameEnd, Date.now())}</span>
            {#if win.kda}
              <span class="kda"> · {win.kda.kills}/{win.kda.deaths}/{win.kda.assists}</span>
            {/if}
          </span>

          {#if Array.isArray(win.items) && win.items.length}
            <span class="win-card-items">
              {#each win.items as id}
                <img
                  class="item-icon"
                  src={itemUrl(id)}
                  alt=""
                  loading="lazy"
                  onerror={(e) => e.currentTarget.remove()}
                />
              {/each}
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
