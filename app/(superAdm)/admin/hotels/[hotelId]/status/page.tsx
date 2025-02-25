// src/app/(admin)/hotels/[hotelId]/rooms/status/page.tsx
// esta es la pagina de estado de habitaciones
// aqui se muestra el estado de todas las habitaciones de un hotel
// y se puede cambiar el estado de cada habitacion
// se usa el componente RoomStatusManager para cambiar el estado de cada habitacion
// se usa el hook useState para manejar el estado de las habitaciones
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import RoomStatusManager from '@/components/hotels/room-status-manager';

/**
 * @function RoomStatusPage
 * @description This component renders a page that displays the status of all rooms in a specific hotel.
 * It allows administrators to view the current status of each room (e.g., available, occupied, cleaning, maintenance)
 * and provides a way to manage these statuses using the `RoomStatusManager` component.
 * @param {object} props - The component's props.
 * @param {object} props.params - The URL parameters.
 * @param {string} props.params.hotelId - The ID of the hotel.
 * @returns {JSX.Element} The rendered RoomStatusPage component.
 */
export default function RoomStatusPage({ params }: { params: { hotelId: string } }) {
  // Hooks
  /**
   * @const hotelId
   * @description Extracts the `hotelId` parameter from the URL.
   * @type {string}
   */
  const hotelId = params.hotelId;

  // State Variables
  /**
   * @const rooms
   * @description Stores the list of rooms fetched from Firestore.
   * @type {Array<object>}
   */
  const [rooms, setRooms] = useState<any[]>([]);

  /**
   * @const isLoading
   * @description Indicates whether the component is currently fetching data.
   * @type {boolean}
   */
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * @function fetchRooms
   * @description Fetches the list of rooms for the specified hotel from Firestore.
   * @async
   * @returns {Promise<void>}
   */
  const fetchRooms = async () => {
    try {
      // Reference to the rooms collection
      const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
      // Execute the query
      const snapshot = await getDocs(query(roomsRef));
      // Transform the snapshot to an array of objects
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Update the state with the fetched data
      setRooms(roomsData);
    } catch (error) {
      // Handle errors
      console.error('Error:', error);
    } finally {
      // Stop the loading indicator
      setIsLoading(false);
    }
  };

  /**
   * @useEffect
   * @description Fetches the list of rooms when the component mounts or when the `hotelId` changes.
   * @dependency hotelId - Changes when the hotelId parameter changes.
   * @returns {void}
   */
  useEffect(() => {
    fetchRooms();
  }, [hotelId]);

  /**
   * @function getStatusColor
   * @description Returns the background and border color classes based on the room's status.
   * @param {string} status - The status of the room ('available', 'occupied', 'cleaning', or 'maintenance').
   * @returns {string} The CSS classes for the background and border color.
   */
  const getStatusColor = (status: string) => {
    /**
     * @constant colors
     * @description An object that maps room statuses to corresponding background and border color classes.
     * @type {Record<string, string>}
     */
    const colors: Record<string, string> = {
      available: 'bg-green-100 border-green-300',
      occupied: 'bg-red-100 border-red-300',
      cleaning: 'bg-blue-100 border-blue-300',
      maintenance: 'bg-yellow-100 border-yellow-300'
    };
    // Return the correct classes or default
    return colors[status] || 'bg-gray-100 border-gray-300';
  };

  /**
   * @description Conditional rendering for the loading state.
   * If `isLoading` is true, display a loading message.
   */
  if (isLoading) {
    return <div>Cargando...</div>;
  }

  /**
   * @description Main component render
   * Renders the layout for the Room Status page, displaying each room and its status.
   */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Estado de Habitaciones</h1>

      {/* Rooms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="space-y-4">
            {/* Card for each room */}
            <Card className={`border-2 ${getStatusColor(room.status)}`}>
              <CardContent className="pt-6">
                {/* Room Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    Habitación {room.number}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Piso {room.floor} - {room.type}
                  </p>
                </div>
                {/* Room Status Manager */}
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
    </div>
  );
}
