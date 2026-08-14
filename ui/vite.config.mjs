import { viteConfig } from '@halo-dev/ui-plugin-bundler-kit';
import path from 'node:path';
import UnoCSS from 'unocss/vite';
import Icons from 'unplugin-icons/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default viteConfig({
  format: 'esm',
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    plugins: [
      Icons({
        compiler: 'vue3',
      }),
      UnoCSS({
        configFile: './uno.config.ts',
        mode: "vue-scoped"
      }),
      nodePolyfills(),
    ],
  },
});
