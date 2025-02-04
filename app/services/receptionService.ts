// src/lib/services/receptionService.ts
import { 
    doc, 
    collection, 
    addDoc, 
    updateDoc, 
    Timestamp, 
    getDoc,
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  import type { 
    ReceptionRoom, 
    OccupancyInfo, 
    RoomStatusChange, 
    CheckoutInfo 
  } from '@/app/lib/types/reception';
  
  interface StatusChangeParams {
    hotelId: string;
    roomId: string;
    newStatus: string;
    previousStatus: string;
    userId: string;
    userName: string;
    notes?: string;
  }
  
  interface OccupancyChangeParams {
    hotelId: string;
    roomId: string;
    occupancyInfo: Partial<OccupancyInfo>;
    userId: string;
    userName: string;
  }
  
  export const receptionService = {
    // Cambiar estado de habitación
    async changeRoomStatus({
      hotelId,
      roomId,
      newStatus,
      previousStatus,
      userId,
      userName,
      notes
    }: StatusChangeParams) {
      try {
        const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
        const timestamp = serverTimestamp();
  
        // Preparar datos de actualización
        const updateData: any = {
          status: newStatus,
          lastStatusChange: timestamp,
          'lastUpdatedBy.id': userId,
          'lastUpdatedBy.name': userName,
          'lastUpdatedBy.timestamp': timestamp
        };
  
        // Manejo específico según el estado
        switch (newStatus) {
          case 'checkout':
            const checkoutInfo: CheckoutInfo = {
              timestamp: Timestamp.now(),
              processedBy: {
                id: userId,
                name: userName
              },
              notes: notes || ''
            };
            updateData.lastCheckout = checkoutInfo;
            updateData.needsCleaning = true;
            break;
  
          case 'in_house':
            updateData.priority = 'high';
            break;
        }
  
        // Actualizar estado de la habitación
        await updateDoc(roomRef, updateData);
  
        // Registrar cambio en el historial
        const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
        const historyData: RoomStatusChange = {
          previousStatus,
          newStatus,
          timestamp: Timestamp.now(),
          userId,
          userName,
          notes: notes || ''
        };
        await addDoc(historyRef, historyData);
  
        // Crear notificación si es necesario
        if (['checkout', 'in_house'].includes(newStatus)) {
          await this.createHousekeepingNotification({
            hotelId,
            roomId,
            roomNumber: (await getDoc(roomRef)).data()?.number,
            status: newStatus,
            priority: newStatus === 'in_house' ? 'high' : 'normal'
          });
        }
  
        return true;
      } catch (error) {
        console.error('Error in changeRoomStatus:', error);
        throw error;
      }
    },
  
    // Actualizar información de ocupación
    async updateOccupancyInfo({
      hotelId,
      roomId,
      occupancyInfo,
      userId,
      userName
    }: OccupancyChangeParams) {
      try {
        const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
        const timestamp = serverTimestamp();
  
        await updateDoc(roomRef, {
          occupancyInfo: {
            ...occupancyInfo,
            lastUpdate: timestamp,
            updatedBy: {
              id: userId,
              name: userName
            }
          }
        });
  
        return true;
      } catch (error) {
        console.error('Error in updateOccupancyInfo:', error);
        throw error;
      }
    },
  
    // Crear notificación para housekeeping
    async createHousekeepingNotification({
      hotelId,
      roomId,
      roomNumber,
      status,
      priority = 'normal'
    }: {
      hotelId: string;
      roomId: string;
      roomNumber: string;
      status: string;
      priority?: 'normal' | 'high';
    }) {
      try {
        const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
        
        await addDoc(notificationsRef, {
          type: status === 'in_house' ? 'priority_cleaning' : 'checkout_cleaning',
          roomId,
          roomNumber,
          status: 'unread',
          timestamp: serverTimestamp(),
          targetRole: 'housekeeping',
          priority,
          message: status === 'in_house' 
            ? `Habitación ${roomNumber} necesita limpieza prioritaria - Huésped esperando`
            : `Habitación ${roomNumber} necesita limpieza de checkout`
        });
  
        return true;
      } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
      }
    },
  
    // Marcar notificación como leída
    async markNotificationAsRead(hotelId: string, notificationId: string) {
      try {
        const notificationRef = doc(db, 'hotels', hotelId, 'notifications', notificationId);
        await updateDoc(notificationRef, {
          status: 'read',
          readAt: serverTimestamp()
        });
  
        return true;
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
  
    // Agregar nota a la habitación
    async addRoomNote({
      hotelId,
      roomId,
      note,
      userId,
      userName
    }: {
      hotelId: string;
      roomId: string;
      note: string;
      userId: string;
      userName: string;
    }) {
      try {
        const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
        const timestamp = serverTimestamp();
  
        await addDoc(collection(roomRef, 'notes'), {
          content: note,
          createdAt: timestamp,
          createdBy: {
            id: userId,
            name: userName
          }
        });
  
        return true;
      } catch (error) {
        console.error('Error adding room note:', error);
        throw error;
      }
    }
  };