// src/app/(admin)/hotels/[hotelId]/rooms/status/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import RoomStatusManager from '@/components/hotels/room-status-manager';

export default function RoomStatusPage({ params }) {
  const hotelId = params.hotelId;
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, [hotelId]);

  const fetchRooms = async () => {
    try {
      const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
      const snapshot = await getDocs(query(roomsRef));
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 border-green-300',
      occupied: 'bg-red-100 border-red-300',
      cleaning: 'bg-blue-100 border-blue-300',
      maintenance: 'bg-yellow-100 border-yellow-300'
    };
    return colors[status] || 'bg-gray-100 border-gray-300';
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Estado de Habitaciones</h1>

      {isLoading ? (
        <div>Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="space-y-4">
              <Card className={`border-2 ${getStatusColor(room.status)}`}>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">
                      Habitación {room.number}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Piso {room.floor} - {room.type}
                    </p>
                  </div>
                  <RoomStatusManager 
                    room={room}
                    hotelId={hotelId}
                    onStatusChange={fetchRooms}
                  />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}