// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');


firebase.initializeApp({
  apiKey: "AIzaSyA9XJg2fLAKgtg9URn3oH7Grc7RbT_aoDU",
  authDomain: "roomflowapp.firebaseapp.com",
  projectId: "roomflowapp",
  storageBucket: "roomflowapp.firebasestorage.app",
  messagingSenderId: "326036360008",
  appId: "1:326036360008:web:c0586e26ef34e86978817d",
});

const messaging = firebase.messaging();

// Manejo de notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("Mensaje recibido en background:", payload);
  const notificationTitle = payload.notification?.title || "Nueva Notificación";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva notificación.",
    icon: '/ios/192.png', // Usa tu logo de la app
    badge: '/ios/100.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
  };

  // Retorna la promesa
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notificación clickeada:", event);
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    console.log("abriendo URL:", event.notification.data.url)
    clients.openWindow(event.notification.data.url);
  } else {
    console.log("No hay URL en la notificación o no se pudo abrir");
  }
});

