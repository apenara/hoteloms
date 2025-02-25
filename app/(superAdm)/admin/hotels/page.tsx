// src/app/(admin)/hotels/page.tsx
// muestra la lista de hoteles, permite filtrar y buscar, agregar nuevos hoteles, editar los existentes y cambiar el estado de los hoteles (prueba, activo, suspendido). Los datos se obtienen de Firestore.

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus } from 'lucide-react';
import HotelFormDialog from '@/components/hotels/hotel-form-dialog';

/**
 * @function HotelsPage
 * @description This component renders the main page for managing hotels in the Super Admin dashboard.
 * It displays a list of hotels, allows filtering and searching, adding new hotels, editing existing ones,
 * and changing the status of hotels (trial, active, suspended). Data is fetched from Firestore.
 * @returns {JSX.Element} The rendered HotelsPage component.
 */
export default function HotelsPage() {
  // State Variables
  /**
   * @const hotels
   * @description State variable to store the list of hotels fetched from Firestore.
   * @type {Array<object>}
   */
  const [hotels, setHotels] = useState<any[]>([]);
  /**
   * @const isLoading
   * @description State variable to indicate if the hotels are currently being loaded.
   * @type {boolean}
   */
  const [isLoading, setIsLoading] = useState<boolean>(true);
  /**
   * @const error
   * @description State variable to store any error message that occurs during data fetching or processing.
   * @type {string}
   */
  const [error, setError] = useState<string>('');
  /**
   * @const searchTerm
   * @description State variable to store the value of the search input used to filter hotels by name or owner.
   * @type {string}
   */
  const [searchTerm, setSearchTerm] = useState<string>('');
  /**
   * @const statusFilter
   * @description State variable to store the selected status filter ('all', 'trial', 'active', 'suspended').
   * @type {string}
   */
  const [statusFilter, setStatusFilter] = useState<string>('all');
  /**
   * @const showForm
   * @description State variable to control the visibility of the `HotelFormDialog` for adding or editing hotels.
   * @type {boolean}
   */
  const [showForm, setShowForm] = useState<boolean>(false);
  /**
   * @const selectedHotel
   * @description State variable to store the data of the hotel selected for editing.
   * It is `null` when adding a new hotel.
   * @type {object | null}
   */
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);

  /**
   * @function fetchHotels
   * @description Fetches the list of hotels from Firestore, ordered by creation date in descending order.
   * @async
   * @returns {Promise<void>}
   */
  const fetchHotels = async () => {
    try {
      // Create a query to get all hotels, ordered by createdAt
      const hotelsQuery = query(collection(db, 'hotels'), orderBy('createdAt', 'desc'));
      // Execute the query
      const snapshot = await getDocs(hotelsQuery);
      // Transform the data to be used in the component
      const hotelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      //Update the hotels state.
      setHotels(hotelsData);
    } catch (err) {
      // Handle errors
      setError('Error al cargar los hoteles');
      console.error(err);
    } finally {
      // Stop the loading state
      setIsLoading(false);
    }
  };

  /**
   * @function handleStatusChange
   * @description Updates the status of a hotel in Firestore.
   * @async
   * @param {string} hotelId - The ID of the hotel to update.
   * @param {string} newStatus - The new status of the hotel ('trial', 'active', 'suspended').
   * @returns {Promise<void>}
   */
  const handleStatusChange = async (hotelId: string, newStatus: string) => {
    try {
      // Update the document in firebase with the new status and update timestamp
      await updateDoc(doc(db, 'hotels', hotelId), {
        status: newStatus,
        updatedAt: new Date()
      });
      // Reload the hotels
      fetchHotels();
    } catch (err) {
      // handle the error
      setError('Error al actualizar el estado del hotel');
      console.error(err);
    }
  };

  /**
   * @useEffect
   * @description Fetches the list of hotels when the component mounts.
   * @returns {void}
   */
  useEffect(() => {
    fetchHotels();
  }, []);

  /**
   * @constant filteredHotels
   * @description Filters the `hotels` array based on the `searchTerm` and `statusFilter`.
   * @type {Array<object>}
   */
  const filteredHotels = hotels.filter(hotel => {
    // Check if the hotel name or owner name matches the search term
    const matchesSearch =
      hotel.hotelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    // Check if the hotel status matches the filter
    const matchesFilter = statusFilter === 'all' || hotel.status === statusFilter;
    // Return true if both conditions are met
    return matchesSearch && matchesFilter;
  });

  /**
   * @function getStatusBadge
   * @description Returns a `Badge` component with styles based on the hotel's status.
   * @param {string} status - The status of the hotel ('trial', 'active', 'suspended').
   * @returns {JSX.Element} The Badge component with the corresponding status styles.
   */
  const getStatusBadge = (status: string) => {
    /**
     * @constant styles
     * @description An object that maps hotel statuses to corresponding CSS classes.
     * @type {Record<string, string>}
     */
    const styles: Record<string, string> = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
    };
    // Return the badge with the corresponding style
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  /**
   * @description Conditional rendering for the loading state.
   * Display a loading message if `isLoading` is true.
   */
  if (isLoading) return <div>Cargando...</div>;

  /**
   * @description Main component render.
   * Renders the main UI for the Hotels page.
   */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hoteles</h1>
        {/* New Hotel Button */}
        <Button onClick={() => {
          setSelectedHotel(null);
          setShowForm(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Hotel
        </Button>
      </div>

      {/* Card with Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Hoteles</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de hotel o propietario..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Status Filter Select */}
            <select
              className="border rounded-md px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="trial">En prueba</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Hotels Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Habitaciones</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Map over filtered hotels */}
                {filteredHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell className="font-medium">{hotel.hotelName}</TableCell>
                    <TableCell>{hotel.ownerName}</TableCell>
                    <TableCell>{getStatusBadge(hotel.status)}</TableCell>
                    <TableCell>{hotel.roomCount}</TableCell>
                    <TableCell>
                      {new Date(hotel.createdAt?.seconds * 1000).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedHotel(hotel);
                          setShowForm(true);
                        }}
                      >
                        Editar
                      </Button>
                      {/* Rooms Button */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.location.href = `/admin/hotels/${hotel.id}/rooms`}
                      >
                        Habitaciones
                      </Button>
                      {/* Activate/Suspend Buttons */}
                      {hotel.status === 'trial' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusChange(hotel.id, 'active')}
                        >
                          Activar
                        </Button>
                      )}
                      {hotel.status === 'active' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStatusChange(hotel.id, 'suspended')}
                        >
                          Suspender
                        </Button>
                      )}
                      {hotel.status === 'suspended' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusChange(hotel.id, 'active')}
                        >
                          Reactivar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Form Dialog */}
      {showForm && (
        <HotelFormDialog
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          hotelToEdit={selectedHotel}
          onSuccess={() => {
            setShowForm(false);
            fetchHotels();
          }}
        />
      )}
    </div>
  );
}
