import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import singleFile from 'vite-plugin-singlefile';

export default defineConfig({
  base: './', // 根据部署路径设定
  plugins: [
    vue(),
    singleFile(), // 添加这个插件
  ],
  build: {
    outDir: 'dist',
    assetsInlineLimit: Infinity, // 避免生成 asset 文件
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: () => 'everything.js', // 避免分包
      }
    }
  }
});
