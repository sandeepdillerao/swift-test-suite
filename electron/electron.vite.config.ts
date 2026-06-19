import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'

// Load electron/.env so RELEASE_GH_TOKEN etc. are available at build time.
// This file is gitignored — never committed.
loadDotenv({ path: resolve(__dirname, '.env') })

// Tokens baked into the main process bundle at build time.
// They are replaced as string literals by Rollup's define plugin.
const buildDefines: Record<string, string> = {
  'process.env.RELEASE_GH_TOKEN': JSON.stringify(process.env.RELEASE_GH_TOKEN ?? ''),
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: buildDefines,
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
    css: {
      postcss: resolve(__dirname, 'postcss.config.cjs'),
    },
  },
})
