import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import InstallBanner from "@/components/InstallBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#00B0EF",
};

export const metadata: Metadata = {
  title: "IPI do Imirim - Louvor & Liturgia",
  description:
    "Plataforma de gestão litúrgica, cifras modulares e análise teológica de louvores da Igreja Presbiteriana Independente do Imirim.",
  manifest: "/manifest.json",
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
      </head>
      <body className="min-h-full flex">
        <AuthProvider>
          <Sidebar />
          {/* Main Content */}
          <main className="flex-1 md:ml-[280px] pb-16 md:pb-0 min-h-screen">
            {children}
          </main>
          <InstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
