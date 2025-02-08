// src/app/api/notifications/send/route.ts
import { getMessaging } from "firebase/messaging";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { tokens, notification, data } = await request.json();

    if (!tokens || !notification) {
      return NextResponse.json(
        { error: "Faltan tokens o datos de notificación" },
        { status: 400 }
      );
    }

    // Inicializar Firebase Admin si no está inicializado
    initAdmin();

    const messaging = getMessaging();

    // Enviar notificación a múltiples dispositivos
    const response = await messaging.sendMulticast({
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data || {},
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          icon: "/logo-192.png",
          badge: "/logo-96.png",
          vibrate: [100, 50, 100],
          requireInteraction: true,
          actions: [
            {
              action: "view",
              title: "Ver detalles",
            },
          ],
        },
        fcmOptions: {
          link: data?.url || "/",
        },
      },
    });

    return NextResponse.json({
      success: true,
      results: response.responses,
    });
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    return NextResponse.json(
      { error: "Error al enviar notificación" },
      { status: 500 }
    );
  }
}

function initAdmin() {
  throw new Error("Function not implemented.");
}
