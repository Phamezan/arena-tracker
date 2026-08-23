<script lang="ts">
  import { app, controls, setFocus, setGroupByWins, setHideIcons } from "./store.svelte";

  // Not persisted (matches original behavior).
  let onlyMissing = $state(false);
</script>

<div id="controls">
  <input
    id="search"
    type="search"
    placeholder="Search champion..."
    bind:value={controls.search}
  />
  <label>
    Greyed based on:
    <select
      id="focusPlayer"
      value={controls.focus}
      onchange={(e) => setFocus(e.currentTarget.value)}
    >
      {#each app.players as player}
        <option value={player.summoner}>{player.summoner}</option>
      {/each}
    </select>
  </label>
  <label>
    <input
      id="groupByWins"
      type="checkbox"
      checked={controls.groupByWins}
      onchange={(e) => setGroupByWins(e.currentTarget.checked)}
    />
    Group by wins
  </label>
  <label>
    <input
      id="hideIcons"
      type="checkbox"
      checked={controls.hideIcons}
      onchange={(e) => setHideIcons(e.currentTarget.checked)}
    />
    Hide icons
  </label>
  <label>
    <input id="onlyMissing" type="checkbox" bind:checked={onlyMissing} />
    Only show champions nobody has
  </label>
</div>
