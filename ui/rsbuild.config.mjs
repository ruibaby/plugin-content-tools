import { rsbuildConfig } from '@halo-dev/ui-plugin-bundler-kit';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { UnoCSSRspackPlugin } from '@unocss/webpack/rspack';
import Icons from 'unplugin-icons/rspack';

export default rsbuildConfig({
  rsbuild: {
    plugins: [pluginNodePolyfill()],
    resolve: {
      alias: {
        '@': './src',
      },
    },
    tools: {
      rspack: {
        cache: false,
        plugins: [
          Icons({
            compiler: 'vue3',
          }),
          UnoCSSRspackPlugin(),
        ],
      },
    },
  },
});
