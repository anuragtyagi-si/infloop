import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'github-pages-route-entries',
    enforce: 'post',
    generateBundle(_, bundle) {
      // Pages serves real directories, not SPA route fallbacks. Each public
      // route gets the same app entry with root-absolute, Vite-built assets.
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') throw new Error('Missing app HTML entry');
      for (const fileName of ['creators/index.html', 'pricing/index.html', 'start/index.html', '404.html']) {
        this.emitFile({ type: 'asset', fileName, source: entry.source });
      }
    },
  }],
  base: '/infloop/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
