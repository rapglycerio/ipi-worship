import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import InstallBanner from "@/components/InstallBanner";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Trava o zoom por pinça/duplo-toque no PWA standalone (iOS respeita em
  // modo app); ampliação de cifra fica por conta dos presets de fonte.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#00B0EF",
};

const SITE_URL = process.env.NEXTAUTH_URL || "https://ipi-worship.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IPI do Imirim - Louvor & Liturgia",
    template: "%s · IPI Louvor",
  },
  description:
    "Plataforma de gestão litúrgica, cifras modulares e análise teológica de louvores da Igreja Presbiteriana Independente do Imirim.",
  manifest: "/manifest.json",
  openGraph: {
    siteName: "IPI do Imirim - Louvor & Liturgia",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/icons/icon-512x512.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex">
        <AuthProvider>
          <Sidebar />
          {/* Main Content */}
          <main className="flex-1 md:ml-[280px] md:transition-[margin] md:duration-300 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen min-w-0 overflow-x-hidden">
            {children}
          </main>
          <InstallBanner />
          <ServiceWorkerRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
