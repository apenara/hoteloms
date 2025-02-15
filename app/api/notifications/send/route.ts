// src/app/api/notifications/send/route.ts
import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebase/admin-config';

export async function POST(request: Request) {
  try {
    const { payload, target } = await request.json();

    const message: admin.messaging.Message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        notification: {
          icon: 'stock_ticker_update',
          color: '#4CAF50',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
            sound: 'default',
          },
        },
      },
    };

    // Configurar el destino de la notificación
    if (target.topic) {
      message.topic = target.topic;
    } else if (target.token) {
      message.token = target.token;
    } else {
      // Si no hay topic ni token, enviar a un topic basado en el hotelId
      message.topic = `hotel_${target.hotelId}`;
    }

    // Enviar la notificación
    const response = await admin.messaging().send(message);

    return NextResponse.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Error sending notification' },
      { status: 500 }
    );
  }
}

// src/app/api/notifications/subscribe/route.ts
export async function POST(request: Request) {
  try {
    const { token, topic } = await request.json();

    // Suscribir el token al tema
    await admin.messaging().subscribeToTopic(token, topic);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return NextResponse.json(
      { error: 'Error subscribing to topic' },
      { status: 500 }
    );
  }
}