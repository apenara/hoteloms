"use client";

import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

/**
 * Interfaz para los tipos de habitaciones
 */
export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  capacity: number;
  amenities: string[];
  basePrice: number;
  cleaningTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cache para los tipos de habitaciones por hotel
 */
const roomTypesCache: Record<string, {
  types: RoomType[];
  timestamp: number;
}> = {};

/**
 * Tiempo de expiración de la caché en milisegundos (5 minutos)
 */
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Obtiene todos los tipos de habitaciones para un hotel
 */
export const getRoomTypes = async (hotelId: string): Promise<RoomType[]> => {
  // Si tenemos una caché válida, la usamos
  if (
    roomTypesCache[hotelId] &&
    Date.now() - roomTypesCache[hotelId].timestamp < CACHE_EXPIRATION
  ) {
    return roomTypesCache[hotelId].types;
  }

  try {
    const roomTypesQuery = query(
      collection(db, "room_types"),
      where("hotelId", "==", hotelId)
    );
    
    const roomTypesSnapshot = await getDocs(roomTypesQuery);
    const roomTypesData: RoomType[] = [];
    
    roomTypesSnapshot.forEach((doc) => {
      const data = doc.data();
      roomTypesData.push({
        id: doc.id,
        hotelId: data.hotelId,
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        amenities: data.amenities,
        basePrice: data.basePrice,
        cleaningTimeMinutes: data.cleaningTimeMinutes,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
    });
    
    // Actualizar la caché
    roomTypesCache[hotelId] = {
      types: roomTypesData,
      timestamp: Date.now()
    };
    
    return roomTypesData;
  } catch (error) {
    console.error("Error al obtener tipos de habitación:", error);
    return [];
  }
};

/**
 * Obtiene un tipo de habitación por su ID
 */
export const getRoomTypeById = async (typeId: string): Promise<RoomType | null> => {
  try {
    const docRef = doc(db, "room_types", typeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        hotelId: data.hotelId,
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        amenities: data.amenities,
        basePrice: data.basePrice,
        cleaningTimeMinutes: data.cleaningTimeMinutes,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error al obtener tipo de habitación:", error);
    return null;
  }
};

/**
 * Obtiene el tiempo de limpieza para un tipo de habitación específico
 */
export const getCleaningTimeForRoomType = async (
  hotelId: string,
  roomTypeId: string,
  cleaningType: string
): Promise<number> => {
  try {
    // Intentar obtener directamente si tenemos el ID
    if (roomTypeId) {
      const roomType = await getRoomTypeById(roomTypeId);
      if (roomType) {
        return applyCleaningTypeMultiplier(roomType.cleaningTimeMinutes, cleaningType);
      }
    }
    
    // Si no tenemos el ID o no se encontró, buscar por nombre
    const roomTypes = await getRoomTypes(hotelId);
    if (roomTypes.length === 0) return getDefaultCleaningTime(cleaningType);
    
    // Si no encontramos un tipo específico, usamos el primero como default
    return applyCleaningTypeMultiplier(roomTypes[0].cleaningTimeMinutes, cleaningType);
  } catch (error) {
    console.error("Error al obtener tiempo de limpieza:", error);
    return getDefaultCleaningTime(cleaningType);
  }
};

/**
 * Aplicar multiplicador según el tipo de limpieza
 */
const applyCleaningTypeMultiplier = (baseMinutes: number, cleaningType: string): number => {
  const multipliers: Record<string, number> = {
    'cleaning_checkout': 1.5,  // Limpieza después de checkout (más profunda)
    'checkout': 1.5,           // Alias para cleaning_checkout
    'checkout_today': 1.5,     // Alias para cleaning_checkout
    'cleaning_occupied': 1.0,  // Limpieza con huésped (estándar)
    'cleaning_touch': 0.5,     // Limpieza rápida (la mitad del tiempo)
    'default': 1.0             // Valor por defecto
  };
  
  const multiplier = multipliers[cleaningType] || multipliers['default'];
  return baseMinutes * multiplier;
};

/**
 * Obtener tiempo de limpieza predeterminado si no hay configuración
 */
const getDefaultCleaningTime = (cleaningType: string): number => {
  const defaultTimes: Record<string, number> = {
    'cleaning_checkout': 45,
    'checkout': 45,
    'checkout_today': 45,
    'cleaning_occupied': 30,
    'cleaning_touch': 15,
    'default': 30
  };
  
  return defaultTimes[cleaningType] || defaultTimes['default'];
};