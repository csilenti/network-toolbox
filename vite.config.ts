import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  /* 相对路径 base：保证 dist/index.html 以 file:// 或任意子路径打开时资源可加载。 */
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
    /* CSS 压缩目标内核：默认 esbuild 按「最新内核」压缩，会把 layout.css 中
       .sidebar-backdrop 的 top/right/bottom/left 四边显式声明重新合并回
       inset: 0 —— 旧版微信 X5/XWeb 内核不识别 inset，抽屉遮罩修复在生产
       包里失效。降低 cssTarget 后 esbuild 不再做现代简写合并。 */
    cssTarget: ['chrome61', 'safari10'],
    sourcemap: false,
  },
});
