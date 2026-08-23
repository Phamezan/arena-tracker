import { cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const root = dirname(fileURLToPath(import.meta.url));

// data/ and assets/ stay at the repo root because the sync/mock tools write
// there; this copies them into dist/ at build time. The dev server serves
// them from the project root automatically.
function copyRootStatic() {
  return {
    name: "copy-root-static",
    apply: "build" as const,
    closeBundle() {
      for (const dir of ["data", "assets"]) {
        cpSync(resolve(root, dir), resolve(root, "dist", dir), { recursive: true });
      }
      for (const file of ["favicon.ico", "favicon.svg", "favicon-96x96.png"]) {
        cpSync(resolve(root, file), resolve(root, "dist", file));
      }
    },
  };
}

export default defineConfig({
  plugins: [svelte(), copyRootStatic()],
  build: {
    rollupOptions: {
      // Multi-page: the migrated tracker plus the not-yet-migrated ladder page.
      input: {
        main: resolve(root, "index.html"),
        ladder: resolve(root, "ladder.html"),
      },
    },
  },
});
