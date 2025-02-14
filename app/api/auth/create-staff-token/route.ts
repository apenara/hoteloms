// app/api/auth/create-staff-token/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase/admin-config';

// Inicializar Firebase Admin
initAdmin();

export async function POST(request: Request) {
  try {
    const { pin, hotelId } = await request.json();
    
    if (!pin || !hotelId) {
      return NextResponse.json(
        { error: 'PIN y Hotel ID son requeridos' }, 
        { status: 400 }
      );
    }

    // Validar PIN en Firestore
    const db = getFirestore();
    const staffQuery = await db
      .collection('hotels')
      .doc(hotelId)
      .collection('staff')
      .where('pin', '==', pin)
      .where('status', '==', 'active')
      .get();

    if (staffQuery.empty) {
      return NextResponse.json(
        { error: 'PIN inválido o usuario inactivo' }, 
        { status: 401 }
      );
    }

    const staffMember = staffQuery.docs[0];
    const staffData = staffMember.data();

    // Generar custom token con claims
    const customToken = await admin.auth().createCustomToken(staffMember.id, {
      hotelId,
      role: staffData.role,
      accessType: 'pin',
      name: staffData.name
    });

    // Establecer cookie de sesión
    const cookieStore = cookies();
    cookieStore.set('staffAccess', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 // 8 horas
    });

    return NextResponse.json({ 
      token: customToken,
      staff: {
        id: staffMember.id,
        ...staffData
      }
    });
  } catch (error) {
    console.error('Error creating custom token:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}