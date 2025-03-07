"use client";
// app/ClientLayout.tsx
import { useEffect } from "react";
import { useNotifications } from "./hooks/useNotifications";
import { useToast } from "./hooks/use-toast";

export default function ClientLayout({
  children, 
}: {
  children: React.ReactNode;
}) {
  const { token, notificationPermission } = useNotifications(); // Ahora solo desestructuramos token y notificationPermission
  const { toast } = useToast();

  useEffect(() => {
    // Registrar el service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log("Service Worker registrado:", registration);
        })
        .catch((error) => {
          console.error("Error registrando Service Worker:", error);
        });
    }
  }, []);

  return <>{children}</>;
}
