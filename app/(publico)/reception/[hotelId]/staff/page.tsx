'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NotificationsDialog } from '@/components/dashboard/NotificationsDialog';
import { ROOM_STATES, ROLE_PERMISSIONS } from '@/app/lib/constants/room-states';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Search, Building } from 'lucide-react';
import { ReceptionRoomCard } from '@/app/components/front/receptionRoomCard';

export default function ReceptionStaffPage() {
  const params = useParams();
  const { staff } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    // Verificar acceso
    if (!staff || staff.role !== 'reception') {
      setError('Acceso no autorizado');
      return;
    }

    const roomsRef = collection(db, 'hotels', params.hotelId, 'rooms');
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error('Error:', error);
      setError('Error al cargar los datos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [params.hotelId, staff]);

  const uniqueFloors = [...new Set(rooms.map(room => room.floor))].sort((a, b) => a - b);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFloor = selectedFloor === 'all' || room.floor.toString() === selectedFloor;
    const matchesStatus = selectedStatus === 'all' || room.status === selectedStatus;
    return matchesSearch && matchesFloor && matchesStatus;
  });

  const roomCounts = rooms.reduce((acc, room) => {
    const status = room.status || 'available';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Panel de Recepción</CardTitle>
            <NotificationsDialog hotelId={params.hotelId} />
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Estado Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(ROOM_STATES)
              .filter(([key]) => ROLE_PERMISSIONS.reception.canView.includes(key))
              .map(([status, config]) => (
                <Card
                  key={status}
                  className={`p-2 cursor-pointer ${config.color} ${
                    selectedStatus === status ? 'ring-2 ring-offset-2' : ''
                  }`}
                  onClick={() => setSelectedStatus(
                    status === selectedStatus ? 'all' : status
                  )}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                      <span className="font-bold">{roomCounts[status] || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredRooms.map((room) => (
              <ReceptionRoomCard
                key={room.id}
                room={room}
                hotelId={params.hotelId}
                currentUser={staff}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}