import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { scriptTema } from "@/components/theme/script";
import { AppToaster } from "@/components/theme/toaster";
import { RegistrarServiceWorker } from "@/components/app/registrar-sw";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Dons CRM",
  description: "Gestão Inteligente de Clientes e Leads",
  applicationName: "Dons CRM",
  appleWebApp: { capable: true, title: "Dons CRM", statusBarStyle: "default" },
  icons: { apple: [{ url: "/api/app/padrao/icone/180?v=1", sizes: "180x180" }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#da4c3c",
  viewportFit: "cover",
};

// Guarda o convite de instalação do Chrome/Edge para o botão "Instalar app" usar depois.
const scriptInstalar = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__convitePWA=e;window.dispatchEvent(new Event('convite-pwa'))});window.addEventListener('appinstalled',function(){window.__convitePWA=null;window.dispatchEvent(new Event('convite-pwa'))});`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("h-full", "antialiased", inter.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
        <script dangerouslySetInnerHTML={{ __html: scriptInstalar }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <AppToaster />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
