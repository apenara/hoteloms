// src/services/access-logs.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserRole, StaffRole } from '@/lib/types';

interface LogAccessParams {
  userId: string;
  userName: string;
  role: UserRole | StaffRole;
  accessType: 'pin' | 'email';
  hotelId: string;
  roomId?: string;  // Opcional
  action?: string;  // Opcional
}

export async function logAccess({
  userId,
  userName,
  role,
  accessType,
  hotelId,
  roomId,
  action = 'login'  // valor por defecto
}: LogAccessParams) {
  try {
    const logsRef = collection(db, 'hotels', hotelId, 'access_logs');
    
    // Crear objeto base de log
    const logData: any = {
      userId,
      userName,
      role,
      accessType,
      action,
      timestamp: serverTimestamp(),
      device: {
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform
      }
    };

    // Solo agregar roomId si está definido
    if (roomId) {
      logData.roomId = roomId;
    }

    // Agregar el log
    const docRef = await addDoc(logsRef, logData);
    
    return {
      success: true,
      logId: docRef.id
    };
  } catch (error) {
    console.error('Error registrando acceso:', error);
    throw error;
  }
}