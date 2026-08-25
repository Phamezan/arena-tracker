<script lang="ts">
  import { health } from "./health.svelte";
  import { describeHealth } from "./health";

  // Re-evaluated on a tick as well as on new data: staleness is time-based, so
  // a heartbeat that simply stops arriving has to raise the banner by itself.
  let now = $state(Date.now());
  $effect(() => {
    const timer = window.setInterval(() => (now = Date.now()), 30_000);
    return () => window.clearInterval(timer);
  });

  const message = $derived(describeHealth(health.latest, now));
</script>

{#if message}
  <div id="healthBanner" role="status">{message}</div>
{/if}
