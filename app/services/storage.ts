// src/app/services/storage.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { v4 as uuidv4 } from 'uuid';

const validateSession = () => {
  const staffSession = sessionStorage.getItem('currentStaffSession');
  if (!staffSession) {
    throw new Error('No hay una sesión activa de personal');
  }
  return JSON.parse(staffSession);
};

export async function uploadMaintenanceImages(
  hotelId: string,
  maintenanceId: string,
  files: File[]
): Promise<string[]> {
  try {
    // Validar sesión activa
    const staffSession = validateSession();
    if (!staffSession.hotelId || staffSession.hotelId !== hotelId) {
      throw new Error('No tiene autorización para subir archivos en este hotel');
    }

    const uploadPromises = files.map(async (file) => {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error(`El archivo ${file.name} debe ser una imagen`);
      }

      // Validar tamaño (5MB máximo)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`La imagen ${file.name} no debe superar los 5MB`);
      }

      // Generar nombre único
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${uuidv4()}.${extension}`;

      // Crear referencia con estructura de carpetas
      const storageRef = ref(
        storage,
        `hotels/${hotelId}/maintenance/${maintenanceId}/${fileName}`
      );

      // Metadata del archivo
      const metadata = {
        contentType: file.type,
        customMetadata: {
          hotelId,
          maintenanceId,
          uploadedBy: staffSession.id,
          uploadedByName: staffSession.name,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };

      // Subir archivo
      const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // Obtener URL
      return await getDownloadURL(snapshot.ref);
    });

    // Esperar que todas las subidas terminen
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error al subir imágenes:', error);
    throw new Error(error instanceof Error ? error.message : 'Error al subir las imágenes');
  }
}