import { defineConfig } from 'astro/config';

export default defineConfig({
  // Set this once the domain is decided — used for share previews.
  site: 'https://pararpujo.in',
  // story.html instead of story/index.html, so /story is served without a redirect
  build: { format: 'file' },
  // the local guide used to live at /chatra (now covers Ghoshpur · Chatra · Aurobindo Road)
  redirects: { '/chatra': '/para' },
});
