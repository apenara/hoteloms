// src/hooks/useReception.ts
import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { 
  ReceptionRoom, 
  ReceptionNotification, 
  RoomFilters, 
  SortOptions 
} from '@/lib/types/reception';
import { receptionService } from '@/lib/services/receptionService';

interface UseReceptionProps {
  hotelId: string;
  initialFilters?: RoomFilters;
  initialSort?: SortOptions;
}

export function useReception({ 
  hotelId, 
  initialFilters, 
  initialSort 
}: UseReceptionProps) {
  const [rooms, setRooms] = useState<ReceptionRoom[]>([]);
  const [notifications, setNotifications] = useState<ReceptionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomFilters>(initialFilters || {});
  const [sortOptions, setSortOptions] = useState<SortOptions>(
    initialSort || { field: 'number', direction: 'asc' }
  );

  // Suscripción a habitaciones y notificaciones
  useEffect(() => {
    if (!hotelId) return;

    setLoading(true);
    
    try {
      // Suscripción a habitaciones
      const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
      const roomsQuery = query(roomsRef, orderBy('number'));
      
      const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReceptionRoom[];
        setRooms(roomsData);
      });

      // Suscripción a notificaciones
      const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('targetRole', 'in', ['reception', 'all']),
        where('status', '==', 'unread'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReceptionNotification[];
        setNotifications(notificationsData);
      });

      setLoading(false);

      return () => {
        unsubscribeRooms();
        unsubscribeNotifications();
      };
    } catch (error) {
      console.error('Error in useReception:', error);
      setError('Error al cargar los datos');
      setLoading(false);
    }
  }, [hotelId]);

  // Filtrar y ordenar habitaciones
  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    // Aplicar filtros
    if (filters.status?.length) {
      result = result.filter(room => filters.status?.includes(room.status));
    }

    if (filters.floor !== undefined) {
      result = result.filter(room => room.floor === filters.floor);
    }

    if (filters.priority) {
      result = result.filter(room => room.priority === filters.priority);
    }

    if (filters.cleaning) {
      result = result.filter(room => room.cleaningProgress?.status === filters.cleaning);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(room => 
        room.number.toLowerCase().includes(searchLower) ||
        room?.occupancyInfo?.guestName?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar ordenamiento
    result.sort((a, b) => {
      switch (sortOptions.field) {
        case 'number':
          return sortOptions.direction === 'asc' 
            ? a.number.localeCompare(b.number)
            : b.number.localeCompare(a.number);
        case 'status':
          return sortOptions.direction === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        case 'lastUpdate':
          const aTime = a.lastStatusChange?.toMillis() || 0;
          const bTime = b.lastStatusChange?.toMillis() || 0;
          return sortOptions.direction === 'asc'
            ? aTime - bTime
            : bTime - aTime;
        case 'priority':
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          const aPriority = priorityOrder[a.priority || 'normal'];
          const bPriority = priorityOrder[b.priority || 'normal'];
          return sortOptions.direction === 'asc'
            ? aPriority - bPriority
            : bPriority - aPriority;
        default:
          return 0;
      }
    });

    return result;
  }, [rooms, filters, sortOptions]);

  // Estadísticas
  const stats = useMemo(() => {
    return rooms.reduce((acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [rooms]);

  // Funciones de utilidad
  const updateFilters = (newFilters: Partial<RoomFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const updateSort = (newSort: Partial<SortOptions>) => {
    setSortOptions(prev => ({ ...prev, ...newSort }));
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await receptionService.markNotificationAsRead(hotelId, notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  return {
    rooms: filteredRooms,
    allRooms: rooms,
    notifications,
    loading,
    error,
    stats,
    filters,
    sortOptions,
    updateFilters,
    updateSort,
    markNotificationAsRead,
    unreadNotificationsCount: notifications.length
  };
}