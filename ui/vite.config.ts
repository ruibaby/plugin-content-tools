import { HaloUIPluginBundlerKit } from "@halo-dev/ui-plugin-bundler-kit";
import Vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    Vue(),
    Icons({ compiler: "vue3" }),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
    UnoCSS({
      configFile: "./uno.config.ts",
      mode: "vue-scoped",
    }),
    HaloUIPluginBundlerKit(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
