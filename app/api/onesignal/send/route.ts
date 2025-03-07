import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Constantes para OneSignal
const ONESIGNAL_APP_ID = "d1a785f6-55aa-44de-91cd-667ab581d0b0";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "tu_rest_api_key"; // Debes configurar esta clave en tus variables de entorno

/**
 * POST /api/onesignal/send
 * 
 * Envía una notificación push a través de OneSignal
 * La solicitud debe incluir:
 * - recipient: ID del usuario o filtros para segmentación
 * - title: Título de la notificación
 * - message: Mensaje de la notificación
 * - data: Datos adicionales (opcional)
 */
export async function POST(req: Request) {
  try {
    // Verificar autenticación del usuario
    const cookieStore = cookies();
    const authToken = cookieStore.get('authToken')?.value;
    const staffAccess = cookieStore.get('staffAccess')?.value;
    
    // Verificar que el usuario esté autenticado de alguna forma
    if (!authToken && !staffAccess) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    // Obtener datos de la solicitud
    const { recipient, title, message, data } = await req.json();
    
    // Validar datos
    if (!recipient || !title || !message) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }
    
    // Crear el payload para OneSignal
    let payload;
    
    // Si recipient es un string, asumimos que es un externalUserId
    if (typeof recipient === 'string') {
      payload = {
        app_id: ONESIGNAL_APP_ID,
        contents: { en: message, es: message },
        headings: { en: title, es: title },
        data: data || {},
        include_external_user_ids: [recipient]
      };
    } 
    // Si recipient es un array, asumimos que son múltiples externalUserIds
    else if (Array.isArray(recipient)) {
      payload = {
        app_id: ONESIGNAL_APP_ID,
        contents: { en: message, es: message },
        headings: { en: title, es: title },
        data: data || {},
        include_external_user_ids: recipient
      };
    }
    // Si recipient es un objeto, asumimos que son filtros
    else if (typeof recipient === 'object') {
      payload = {
        app_id: ONESIGNAL_APP_ID,
        contents: { en: message, es: message },
        headings: { en: title, es: title },
        data: data || {},
        filters: recipient
      };
    } else {
      return NextResponse.json(
        { error: 'Formato de recipient inválido' },
        { status: 400 }
      );
    }
    
    // Enviar notificación a OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    // Procesar respuesta
    const responseData = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al enviar notificación', details: responseData },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Error al procesar solicitud de notificación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}