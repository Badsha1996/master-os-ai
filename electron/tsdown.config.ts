import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      main: "src/main.ts",
    },
    format: "esm",
    outDir: "dist-electron",
    target: "node20",
    clean: true,
  },
  {
    entry: {
      preload: "src/preload.ts",
    },
    format: "cjs",
    outDir: "dist-electron",
    target: "node20",
  },
]);
