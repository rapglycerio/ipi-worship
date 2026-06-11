import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack é o builder padrão no Next.js 16
  turbopack: {},

  // Permite imagens do Google (avatares do OAuth)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // O service worker offline (public/sw.js) nunca deve ficar preso no cache do
  // navegador — assim novas versões do SW são aplicadas no próximo carregamento.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;

// NOTA PWA: o offline é provido por um service worker escrito à mão em
// public/sw.js (registrado por ServiceWorkerRegister), sem next-pwa/webpack,
// pois next-pwa v5 não é compatível com Turbopack. O manifest.json em /public
// garante a instalabilidade (ícones em /public/icons, standalone).
