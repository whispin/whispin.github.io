import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  base: './', 
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  },
  server: {
    historyApiFallback: true // 注意：这是 express 中的用法，vite 内部并不使用 express
  }
});
