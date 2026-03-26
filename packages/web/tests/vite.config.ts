import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  server: {
    port: 5199,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@jambonz/client-sdk-web': path.resolve(__dirname, '../src/index.ts'),
      '@jambonz/client-sdk-core': path.resolve(__dirname, '../../core/src/index.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
