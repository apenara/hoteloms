'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Building,
  Bell,
  Timer
} from 'lucide-react';

import { ROOM_STATES, ROLE_PERMISSIONS } from '@/app/lib/constants/room-states';
import { RoomCard } from '@/components/hotels/RoomCard';
import { Room } from '@/lib/types';

// Filtramos los estados relevantes para recepción
const RECEPTION_STATES = Object.entries(ROOM_STATES).reduce((acc, [key, value]) => {
  if (ROLE_PERMISSIONS.reception.canView.includes(key)) {
    acc[key] = value;
  }
  return acc;
}, {});

export default function ReceptionView() {
  const { staff } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notifications, setNotifications] = useState([]);

  // Cargar datos de habitaciones y notificaciones
  useEffect(() => {
    if (!staff?.hotelId) return;

    try {
      // Suscripción a habitaciones
      const roomsRef = collection(db, 'hotels', staff.hotelId, 'rooms');
      const unsubscribeRooms = onSnapshot(roomsRef, (snapshot) => {
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Room[];
        setRooms(roomsData);
        setLoading(false);
      });

      // Suscripción a notificaciones
      const notificationsRef = collection(db, 'hotels', staff.hotelId, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('status', '==', 'unread'),
        where('targetRole', '==', 'reception'),
        where('targetStaffId', '==', staff.id) // New line
      );

      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notificationsData);
      });

      return () => {
        unsubscribeRooms();
        unsubscribeNotifications();
      };
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error al cargar los datos');
      setLoading(false);
    }
  }, [staff?.hotelId, staff?.id]); // Add staff.id to dependency array

  // Calcular pisos únicos
  const uniqueFloors = useMemo(() => {
    return [...new Set(rooms.map(room => room.floor))].sort((a, b) => a - b);
  }, [rooms]);

  // Calcular estadísticas
  const statistics = useMemo(() => {
    return rooms.reduce((acc, room) => {
      const status = room.status || 'available';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [rooms]);

  // Filtrar habitaciones
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFloor = selectedFloor === 'all' || room.floor.toString() === selectedFloor;
      const matchesStatus = selectedStatus === 'all' || room.status === selectedStatus;
      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [rooms, searchTerm, selectedFloor, selectedStatus]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">
              Panel de Recepción
            </CardTitle>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Bell className="h-4 w-4" />
                  {notifications.length}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar habitación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger>
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Seleccionar piso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pisos</SelectItem>
                  {uniqueFloors.map(floor => (
                    <SelectItem key={floor} value={floor.toString()}>
                      Piso {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
            {Object.entries(RECEPTION_STATES).map(([status, config]) => (
              <Card
                key={status}
                className={`cursor-pointer transition-all ${config.color} ${
                  selectedStatus === status ? 'ring-2 ring-offset-2' : ''
                }`}
                onClick={() => setSelectedStatus(status === selectedStatus ? 'all' : status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <config.icon className="h-5 w-5" />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {statistics[status] || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                hotelId={staff?.hotelId}
                currentUser={staff}
                role="reception"
                allowedTransitions={ROLE_PERMISSIONS.reception.canModify}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
