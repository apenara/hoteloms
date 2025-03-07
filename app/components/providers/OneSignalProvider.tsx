"use client";

import { useEffect } from 'react';
import Script from 'next/script';

export default function OneSignalProvider() {
  // Esta función se ejecutará después de que el script de OneSignal se haya cargado
  const handleOneSignalLoad = () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: "d1a785f6-55aa-44de-91cd-667ab581d0b0",
        safari_web_id: "web.onesignal.auto.3431b9a6-8377-4186-9b23-bf65dbb4a731",
        notifyButton: {
          enable: true,
        },
        allowLocalhostAsSecureOrigin: true, // Útil para desarrollo local
      });
    });
  };

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        onLoad={handleOneSignalLoad}
        strategy="afterInteractive"
      />
    </>
  );
}