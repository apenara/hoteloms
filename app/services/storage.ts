// src/app/services/storage.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import { v4 as uuidv4 } from "uuid";

const validateSession = () => {
  const staffSession = sessionStorage.getItem("currentStaffSession");
  if (!staffSession) {
    throw new Error("No hay una sesión activa de personal");
  }
  return JSON.parse(staffSession);
};

export async function uploadMaintenanceImages(
  hotelId: string,
  assetId: string | null, // Now assetId can be null, but is required
  maintenanceId: string | null, // Make this optional, it is null for assets
  files: File[]
): Promise<string[]> {
  try {
    // Validar datos
    if (!hotelId || (!assetId && !maintenanceId)) {
      console.error("Datos incompletos para subir imágenes", {
        hotelId,
        assetId,
        maintenanceId,
      });
      throw new Error("Datos incompletos para subir imágenes");
    }

    if (!files.length) {
      console.log("No hay archivos para subir");
      return [];
    }

    console.log(`Preparando para subir ${files.length} imágenes`);

    // Validar sesión activa (opcional, dependiendo de tu implementación)
    const staffSession = sessionStorage.getItem("currentStaffSession");
    if (!staffSession) {
      console.warn("No hay una sesión activa de personal");
      // Dependiendo de tu lógica, podrías lanzar un error o continuar
    }

    const uploadPromises = files.map(async (file, index) => {
      console.log(
        `Procesando imagen ${index + 1}/${files.length}: ${file.name}`
      );

      // Validar tipo de archivo
      if (!file.type.startsWith("image/")) {
        console.warn(`El archivo ${file.name} no es una imagen`);
        throw new Error(`El archivo ${file.name} debe ser una imagen`);
      }

      // Validar tamaño (5MB máximo)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        console.warn(`El archivo ${file.name} excede el tamaño máximo`);
        throw new Error(`La imagen ${file.name} no debe superar los 5MB`);
      }

      // Generar nombre único
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${uuidv4()}.${extension}`;
      console.log(`Nombre generado para imagen ${index + 1}: ${fileName}`);

      // Crear referencia con estructura de carpetas
      let storageRef;
      if (maintenanceId) {
        storageRef = ref(
          storage,
          `hotels/${hotelId}/maintenance/${maintenanceId}/${fileName}`
        );
      } else {
        storageRef = ref(
          storage,
          `hotels/${hotelId}/assets/${assetId}/${fileName}`
        );
      }

      // Subir archivo
      console.log(`Iniciando subida de imagen ${index + 1}`);
      const snapshot = await uploadBytes(storageRef, file);
      console.log(`Imagen ${index + 1} subida correctamente`);

      // Obtener URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log(`URL obtenida para imagen ${index + 1}: ${downloadUrl}`);

      return downloadUrl;
    });

    console.log("Esperando que todas las subidas terminen...");
    // Esperar que todas las subidas terminen
    const urls = await Promise.all(uploadPromises);
    console.log(`${urls.length} imágenes subidas exitosamente`);

    return urls;
  } catch (error) {
    console.error("Error al subir imágenes:", error);
    throw error;
  }
}
