import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the shared package from source. Its dist build is CommonJS
      // (NodeNext) for the API's sake; Rollup cannot statically read named
      // runtime exports (cpmCents) through that interop, and the source is
      // plain TS Vite handles directly.
      "@naano/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
  },
});
