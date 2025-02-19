// src/services/tokenService.ts
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { requestNotificationPermission } from '@/lib/firebase/config';

export async function registerUserToken(userId: string, hotelId: string, role: string) {
  try {
    // 1. Solicitar permiso y obtener token
    const fcmToken = await requestNotificationPermission();
    if (!fcmToken) return null;

    // 2. Verificar si el token ya existe
    const tokensRef = collection(db, 'notification_tokens');
    const q = query(
      tokensRef, 
      where('userId', '==', userId),
      where('token', '==', fcmToken)
    );
    
    const snapshot = await getDocs(q);

    // Si el token no existe, crearlo
    if (snapshot.empty) {
      await addDoc(tokensRef, {
        token: fcmToken,
        userId,
        hotelId,
        role,
        platform: 'web',
        createdAt: Timestamp.now(),
        lastUsed: Timestamp.now()
      });
    }

    return fcmToken;
  } catch (error) {
    console.error('Error registering token:', error);
    return null;
  }
}

export async function removeUserTokens(userId: string) {
  try {
    const tokensRef = collection(db, 'notification_tokens');
    const q = query(tokensRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return true;
  } catch (error) {
    console.error('Error removing tokens:', error);
    return false;
  }
}