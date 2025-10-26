// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: "server",
  security: {
    checkOrigin: false // we NEED to do a cross-origin request (Airtable -> iplace)
  },
  adapter: node({
    mode: "standalone"
  })
});
