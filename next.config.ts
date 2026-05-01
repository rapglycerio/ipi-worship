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
};

export default nextConfig;

// NOTA PWA: next-pwa v5 usa webpack e não é compatível com Turbopack.
// O manifest.json em /public já garante a instalabilidade da PWA (ícones, standalone).
// Para service workers offline, use @serwist/next ou @ducanh2912/next-pwa quando
// suporte oficial ao Turbopack estiver disponível.
