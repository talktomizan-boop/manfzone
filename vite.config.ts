import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
});
