// src/lib/services/storage.ts
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadMaintenanceImages = async (
  hotelId: string,
  maintenanceId: string,
  files: File[]
): Promise<string[]> => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.log('No hay archivos para subir');
    return [];
  }

  try {
    const uploadPromises = files.map(async (file) => {
      try {
        // Crear una referencia única para la imagen
        const imageRef = ref(
          storage,
          `hotels/${hotelId}/maintenance/${maintenanceId}/${Date.now()}_${file.name}`
        );

        // Subir la imagen
        const uploadResult = await uploadBytes(imageRef, file);
        
        // Obtener la URL de descarga
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        return downloadURL;
      } catch (error) {
        console.error('Error al subir imagen individual:', error);
        throw error;
      }
    });

    // Esperar a que todas las imágenes se suban
    const urls = await Promise.all(uploadPromises);
    console.log('URLs de imágenes subidas:', urls);
    return urls;
  } catch (error) {
    console.error('Error en uploadMaintenanceImages:', error);
    throw error;
  }
};