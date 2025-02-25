// app/components/reception/RoomsSection.tsx
import { useState } from 'react';
import { ReceptionRoomCard } from '@/app/components/front/receptionRoomCard';
import { RoomFilters } from './RoomFilters';
import { RoomStateCounters } from './RoomStateCounters';

interface RoomsSectionProps {
  rooms: any[];
  hotelId: string;
  staff: any;
}

export function RoomsSection({ rooms, hotelId, staff }: RoomsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

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

  const sortRooms = (a, b) => {
    const regex = /([a-zA-Z]*)(\d*)/;
    const [, aLetters, aNumbers] = a.number.match(regex) || [];
    const [, bLetters, bNumbers] = b.number.match(regex) || [];

    if (aLetters < bLetters) return -1;
    if (aLetters > bLetters) return 1;

    const aNum = parseInt(aNumbers, 10);
    const bNum = parseInt(bNumbers, 10);
    return aNum - bNum;
  };

  // Ordenar las habitaciones
  const sortedRooms = filteredRooms.sort(sortRooms);

  return (
    <div className="space-y-4">
      {/* Filtros de habitaciones */}
      <RoomFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFloor={selectedFloor}
        setSelectedFloor={setSelectedFloor}
        uniqueFloors={uniqueFloors}
      />

      {/* Estado Counters */}
      <RoomStateCounters
        roomCounts={roomCounts}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      {/* Lista de habitaciones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedRooms.map((room) => (
          <ReceptionRoomCard
            key={room.id}
            room={room}
            hotelId={hotelId}
            currentUser={staff}
          />
        ))}
      </div>
    </div>
  );
}