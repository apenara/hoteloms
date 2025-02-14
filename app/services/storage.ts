// src/app/services/storage.ts
import { ref, uploadBytes, getDownloadURL, getAuth } from 'firebase/storage';
import { storage, auth } from '@/lib/firebase/config';
import { v4 as uuidv4 } from 'uuid';

export async function uploadMaintenanceImages(
  hotelId: string,
  maintenanceId: string,
  files: File[]
): Promise<string[]> {
  try {
    // Obtener token de autenticación
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      // Si no hay token, crear uno temporal para el staff
      const staffSession = sessionStorage.getItem('currentStaffSession');
      if (!staffSession) {
        throw new Error('No hay una sesión activa');
      }
      // Aquí podrías implementar una llamada a tu API para generar un token temporal
    }

    const uploadPromises = files.map(async (file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${uuidv4()}.${extension}`;
      
      const storageRef = ref(
        storage,
        `hotels/${hotelId}/maintenance/${maintenanceId}/${fileName}`
      );

      const metadata = {
        contentType: file.type,
        customMetadata: {
          hotelId,
          maintenanceId
        }
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      return await getDownloadURL(snapshot.ref);
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error al subir imágenes:', error);
    throw error;
  }
}