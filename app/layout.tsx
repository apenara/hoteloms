import "./ui/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import ClientLayout from "./ClientLayout";
// import { NotificationProvider } from "./components/providers/NotificationProvider";
// import { Toaster } from "./components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HotelOms",
  description: "Sistema de Gestión Hotelera",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};
export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>{" "}
        </AuthProvider>
      </body>
    </html>
  );
}

// if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
//   window.addEventListener('load', function() {
//     navigator.serviceWorker.register('/firebase-messaging-sw.js').then(
//       function(registration) {
//         console.log('Service Worker registrado exitosamente:', registration.scope);
//       },
//       function(err) {
//         console.log('Error al registrar Service Worker:', err);
//       }
//     );
//   });
// }
