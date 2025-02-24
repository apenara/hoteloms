// src/app/api/notifications/subscribe/route.ts
import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebase/admin-config';

export async function POST(request: Request) {
  try {
    const { token, topic } = await request.json();

    if (!token || !topic) {
      return NextResponse.json(
        { error: 'Token y topic son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el topic sea seguro (solo alfanuméricos, guiones y guiones bajos)
    if (!/^[a-zA-Z0-9_-]+$/.test(topic)) {
      return NextResponse.json(
        { error: 'Topic inválido' },
        { status: 400 }  
      );
    }

    // Suscribir el token al tema
    await admin.messaging().subscribeToTopic([token], topic);

    return NextResponse.json({
      success: true,
      message: `Token suscrito exitosamente al tema ${topic}`
    });
  } catch (error) {
    console.error('Error en suscripción a tema:', error);
    return NextResponse.json(
      { error: 'Error al procesar la suscripción' },
      { status: 500 }
    );
  }
}