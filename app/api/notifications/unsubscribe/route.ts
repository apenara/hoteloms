// src/app/api/notifications/unsubscribe/route.ts
export async function POST(request: Request) {
    try {
      const { token, topic } = await request.json();
  
      if (!token || !topic) {
        return NextResponse.json(
          { error: 'Token y topic son requeridos' },
          { status: 400 }
        );
      }
  
      // Validar que el topic sea seguro
      if (!/^[a-zA-Z0-9_-]+$/.test(topic)) {
        return NextResponse.json(
          { error: 'Topic inválido' },
          { status: 400 }
        );
      }
  
      // Desuscribir el token del tema
      await admin.messaging().unsubscribeFromTopic([token], topic);
  
      return NextResponse.json({
        success: true,
        message: `Token desuscrito exitosamente del tema ${topic}`
      });
    } catch (error) {
      console.error('Error en desuscripción de tema:', error);
      return NextResponse.json(
        { error: 'Error al procesar la desuscripción' },
        { status: 500 }
      );
    }
  }