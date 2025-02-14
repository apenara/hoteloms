// src/services/storageService.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { v4 as uuidv4 } from 'uuid';

interface UploadMaintenanceImageParams {
  hotelId: string;
  maintenanceId: string;
  file: File;
  customToken?: string;
}

export const storageService = {
  async uploadMaintenanceImage({
    hotelId,
    maintenanceId,
    file,
    customToken
  }: UploadMaintenanceImageParams) {
    try {
      // Validar el tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      // Validar el tamaño del archivo (5MB max)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB en bytes
      if (file.size > MAX_SIZE) {
        throw new Error('La imagen no debe superar los 5MB');
      }

      // Generar un nombre único para el archivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;

      // Crear la referencia al archivo en Storage
      const storageRef = ref(
        storage,
        `hotels/${hotelId}/maintenance/${maintenanceId}/${fileName}`
      );

      // Subir el archivo
      const snapshot = await uploadBytes(storageRef, file);

      // Obtener la URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        fileName,
        downloadURL,
        path: snapshot.ref.fullPath
      };
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw new Error('Error al subir la imagen. Por favor, intente nuevamente.');
    }
  },

  async uploadPublicHotelFile({
    hotelId,
    file,
    folder = 'general'
  }: {
    hotelId: string;
    file: File;
    folder?: string;
  }) {
    try {
      const fileName = `${uuidv4()}-${file.name}`;
      const storageRef = ref(
        storage,
        `hotels/${hotelId}/public/${folder}/${fileName}`
      );

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        fileName,
        downloadURL,
        path: snapshot.ref.fullPath
      };
    } catch (error) {
      console.error('Error al subir archivo:', error);
      throw new Error('Error al subir el archivo. Por favor, intente nuevamente.');
    }
  }
};