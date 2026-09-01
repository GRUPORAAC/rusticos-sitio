// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://bodegadetalavera.com',
  build: { format: 'directory', inlineStylesheets: 'never' },
});
