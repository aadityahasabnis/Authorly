/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    // Library build mode
    return {
      plugins: [
        react(),
        dts({
          insertTypesEntry: true,
          exclude: ['src/test/**', 'test/**'],
        }),
      ],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'ContentBlocks',
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`,
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime', '@excalidraw/excalidraw', 'lucide-react'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'style.css') return 'authorly.css';
              return assetInfo.name || '';
            },
          },
        },
        cssCodeSplit: false,
        // PROFESSIONAL FIX: Don't include source maps in published package
        // Users don't need them, and they add 1.6MB of unnecessary weight
        sourcemap: false,
        minify: 'esbuild',
        // PROFESSIONAL FIX: Optimize for smaller bundle size
        target: 'es2020',
        cssMinify: true,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        },
      },
    };
  }

  if (mode === 'cdn') {
    // CDN/UMD build mode for use in HTML pages with <script> tags
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'Authorly',
          formats: ['umd'],
          fileName: () => 'authorly.umd.js',
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: {
              'react': 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'React',
            } as Record<string, string>,
            assetFileNames: 'authorly.[ext]',
          },
        },
        cssCodeSplit: false,
        sourcemap: false,
        minify: 'esbuild',
        target: 'es2020',
        cssMinify: true,
        outDir: 'dist/cdn',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        },
      },
    };
  }

  // Development mode
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3001,
      open: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
