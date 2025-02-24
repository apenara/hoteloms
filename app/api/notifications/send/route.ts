// src/app/api/notifications/send/route.ts
import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebase/admin-config';

export async function POST(request: Request) {
  try {
    const { payload, target } = await request.json();

    // Validar que el payload tenga la estructura correcta
    if (!payload || !payload.notification || !payload.notification.title || !payload.notification.body) {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      );
    }

    const message: admin.messaging.Message = {
      notification: {
        title: payload.notification.title,
        body: payload.notification.body,
      },
      data: payload.data || {},
      token: payload.token,
      condition: target.condition || '',
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

