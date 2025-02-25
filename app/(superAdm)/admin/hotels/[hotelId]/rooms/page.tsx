// src/app/(admin)/hotels/[hotelId]/rooms/page.tsx
// este componente es el que se encarga de mostrar las habitaciones de un hotel en especifico
// se encarga de mostrar la lista de habitaciones, buscar, editar, agregar y eliminar habitaciones
// los datos son obtenidos de Firestore y la interfaz es renderizada usando componentes de Shadcn UI

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus } from 'lucide-react';
import RoomFormDialog from '@/components/hotels/room-form-dialog';

/**
 * @function RoomsPage
 * @description This component renders a page that displays a list of rooms for a specific hotel.
 * It allows administrators to view, search, edit, add, and delete rooms.
 * Data is fetched from Firestore, and the UI is rendered using Shadcn UI components.
 * @returns {JSX.Element} The rendered RoomsPage component.
 */
export default function RoomsPage() {
  // Hooks
  /**
   * @const params
   * @description Extracts the `hotelId` parameter from the URL.
   * @type {{ hotelId: string }}
   * @property {string} hotelId - The ID of the hotel for which to display rooms.
   */
  const params = useParams<{ hotelId: string }>();

  /**
   * @const hotelId
   * @description Stores the hotelId extracted from the params, to be used in queries.
   * @type {string}
   */
  const hotelId = params.hotelId;

  // State variables
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
   * @const error
   * @description Stores any error message that occurs during data fetching or processing.
   * @type {string}
   */
  const [error, setError] = useState<string>('');

  /**
   * @const searchTerm
   * @description Stores the value of the search input to filter rooms by number.
   * @type {string}
   */
  const [searchTerm, setSearchTerm] = useState<string>('');

  /**
   * @const showForm
   * @description Controls the visibility of the room form dialog (for adding/editing rooms).
   * @type {boolean}
   */
  const [showForm, setShowForm] = useState<boolean>(false);

  /**
   * @const selectedRoom
   * @description Stores the room data that is currently selected for editing.
   * It is `null` when adding a new room.
   * @type {object | null}
   */
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  /**
   * @function fetchRooms
   * @description Fetches the list of rooms for the specified hotel from Firestore.
   * It orders the rooms by their number in ascending order.
   * @async
   * @returns {Promise<void>}
   */
  const fetchRooms = async () => {
    try {
      // Reference to the rooms collection
      const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
      // Query to get rooms, ordered by number
      const q = query(roomsRef, orderBy('number', 'asc'));
      // Execute the query
      const snapshot = await getDocs(q);
      // Transform the snapshot to an array of objects
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Update the state with the fetched data
      setRooms(roomsData);
    } catch (error) {
      // Handle errors
      console.error('Error fetching rooms:', error);
      setError('Error al cargar las habitaciones');
    } finally {
      // Stop the loading indicator
      setIsLoading(false);
    }
  };

  /**
   * @function handleDeleteRoom
   * @description Deletes a room from Firestore after a confirmation from the user.
   * @async
   * @param {string} roomId - The ID of the room to delete.
   * @returns {Promise<void>}
   */
  const handleDeleteRoom = async (roomId: string) => {
    // Confirm with the user
    if (window.confirm('¿Estás seguro de que deseas eliminar esta habitación?')) {
      try {
        // Delete the room document
        await deleteDoc(doc(db, 'hotels', hotelId, 'rooms', roomId));
        // Refresh the list of rooms
        await fetchRooms();
      } catch (error) {
        // Handle errors
        console.error('Error al eliminar la habitación:', error);
        setError('Error al eliminar la habitación');
      }
    }
  };

  /**
   * @useEffect
   * @description Fetches the list of rooms when the component mounts or the `hotelId` changes.
   * @dependency hotelId - Changes when the hotel id changes.
   * @returns {void}
   */
  useEffect(() => {
    if (hotelId) {
      fetchRooms();
    }
  }, [hotelId]);

  /**
   * @function getStatusBadge
   * @description Returns a Badge component with styles based on the room's status.
   * @param {string} status - The status of the room ('available', 'occupied', 'maintenance', 'cleaning', etc.).
   * @returns {JSX.Element} The Badge component with the corresponding status styles.
   */
  const getStatusBadge = (status: string) => {
    /**
    * @constant styles
    * @description An object that maps room statuses to corresponding CSS classes.
    * @type {Record<string, string>}
    */
    const styles: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      cleaning: 'bg-blue-100 text-blue-800'
    };
    // Return the badge with the correct styles
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  /**
   * @constant filteredRooms
   * @description Filters the `rooms` array based on the `searchTerm`.
   * It performs a case-insensitive search on the room number.
   * @type {Array<object>}
   */
  const filteredRooms = rooms.filter(room =>
    room.number.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * @description Conditional rendering for the loading state.
   * Display a loading message when data is being fetched.
   */
  if (isLoading) return <div>Cargando...</div>;

  /**
   * @description Conditional rendering for errors.
   * Display an error message if there is any error.
   */
  if (error) return <div>Error: {error}</div>;

  /**
   * @description Main component render.
   * Renders the UI for the rooms page, including the list of rooms,
   * search input, and the "New Room" button.
   */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Habitaciones</h1>
        {/* New Room Button */}
        <Button
          onClick={() => {
            setSelectedRoom(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Habitación
        </Button>
      </div>

      {/* Card with Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Habitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de habitación..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Rooms Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Piso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Map over filtered rooms */}
                {filteredRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.number}</TableCell>
                    <TableCell>{room.type}</TableCell>
                    <TableCell>{getStatusBadge(room.status)}</TableCell>
                    <TableCell>{room.floor}</TableCell>
                    <TableCell className="text-right">
                      {/* Edit Room Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRoom(room);
                          setShowForm(true);
                        }}
                      >
                        Editar
                      </Button>
                      {/* Delete Room Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Room Form Dialog */}
      {showForm && (
        <RoomFormDialog
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          hotelId={hotelId}
          roomToEdit={selectedRoom}
          onSuccess={() => {
            setShowForm(false);
            fetchRooms();
          }}
        />
      )}
    </div>
  );
}
