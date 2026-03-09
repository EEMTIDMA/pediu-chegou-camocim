import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png'], // Adicionei seus arquivos aqui
      manifest: {
        name: 'Pediu Chegou SaaS',
        short_name: 'PediuChegou',
        description: 'Dashboard do Entregador - Pediu Chegou',
        theme_color: '#312D6F',
        background_color: '#F8F9FA',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'logo.png', // Usando seu logo atual como quebra-galho
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
