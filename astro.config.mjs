import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import tailwind from "@astrojs/tailwind";

import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://menus.bysmax.com',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/admin/') && !page.includes('/auth/'),
    }),
    tailwind(),
    react(),
  ],
  output: 'static',
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    }
  }),
  prefetch: {
    prefetchAll: true, // Esto hace que TODOS los <a href> tengan prefetch por defecto
    defaultStrategy: 'tap' // Opciones: 'hover', 'tap', 'viewport', 'load'
  },
  redirects:{
    "/menus/campomar/san-pedro/": "/menus/campomar",
  },
  image: {
    // Dominios permitidos para optimización de imágenes externas
    domains: [
      'images.unsplash.com',
      'cdn.sanity.io',
      'fmngpfyzqgfttmpiwdmm.supabase.co',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'images.letseat.mx'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
    ],
  },
});