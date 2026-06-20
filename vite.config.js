import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for assets so it loads correctly on Itch.io and static hosting
  server: {
    port: 3000
  }
});
