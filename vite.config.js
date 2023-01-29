import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import * as path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
    //extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.dev.js', '.wasm'],
  },
  plugins: [
    svelte(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
    wasm(),
    topLevelAwait()
  ],
  worker: {
    format: "es",
    plugins: [
      wasm(),
      topLevelAwait()
    ]
  },
  server: {
    cors: {
      origin: '*',
      methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      allowedHeaders: 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization',
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    }
  }
})
