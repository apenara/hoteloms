// src/lib/services/access-logs.ts
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { AccessLog } from '@/lib/constants/permissions';

export async function logAccess({
  userId,
  userName,
  role,
  accessType,
  hotelId,
  roomId,
  action
}: AccessLog) {
  try {
    const logsRef = collection(db, 'hotels', hotelId, 'access_logs');
    
    await addDoc(logsRef, {
      userId,
      userName,
      role,
      accessType,
      timestamp: new Date(),
      hotelId,
      roomId,
      action,
      ipAddress: '', // Se puede implementar la captura de IP si es necesario
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
    });
    
  } catch (error) {
    console.error('Error al registrar acceso:', error);
    // Podríamos manejar el error de forma más específica si es necesario
  }
}

export async function getAccessLogs(
  hotelId: string,
  filters?: {
    userId?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  try {
    const logsRef = collection(db, 'hotels', hotelId, 'access_logs');
    let q = query(logsRef, orderBy('timestamp', 'desc'));

    // Aplicar filtros si existen
    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters?.role) {
      q = query(q, where('role', '==', filters.role));
    }
    if (filters?.startDate) {
      q = query(q, where('timestamp', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      q = query(q, where('timestamp', '<=', filters.endDate));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('Error al obtener logs de acceso:', error);
    throw error;
  }
}