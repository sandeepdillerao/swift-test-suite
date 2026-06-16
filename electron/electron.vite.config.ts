import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, '../frontend'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, '../frontend/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '../frontend/src'),
      },
    },
    plugins: [react()],
    server: {
      port: 5174,
    },
    // Use a CJS postcss config that explicitly loads the frontend's tailwind config
    css: {
      postcss: resolve(__dirname, 'postcss.config.cjs'),
    },
  },
})
