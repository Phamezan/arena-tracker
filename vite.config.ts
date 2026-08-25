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
  // Project Pages serves this under /arena-tracker/, not the domain root, so
  // built asset URLs must carry that prefix or every request 404s.
  base: "/arena-tracker/",
  plugins: [svelte(), copyRootStatic()],
});
