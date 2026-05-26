import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react'; // <--- Das muss hier stehen!

export default defineConfig({
  integrations: [tailwind(), react()], // <--- Und hier aktiviert sein!
});