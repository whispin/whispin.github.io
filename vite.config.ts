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
  }
});
