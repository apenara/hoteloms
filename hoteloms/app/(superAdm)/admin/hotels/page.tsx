// src/app/(admin)/hotels/page.tsx
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

export default function HotelsPage() {
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const hotelsQuery = query(collection(db, 'hotels'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(hotelsQuery);
      const hotelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHotels(hotelsData);
    } catch (err) {
      setError('Error al cargar los hoteles');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (hotelId, newStatus) => {
    try {
      await updateDoc(doc(db, 'hotels', hotelId), {
        status: newStatus,
        updatedAt: new Date()
      });
      fetchHotels();
    } catch (err) {
      setError('Error al actualizar el estado del hotel');
      console.error(err);
    }
  };

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch =
      hotel.hotelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || hotel.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hoteles</h1>
        <Button onClick={() => {
          setSelectedHotel(null);
          setShowForm(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Hotel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Hoteles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de hotel o propietario..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.location.href = `/admin/hotels/${hotel.id}/rooms`}
                      >
                        Habitaciones
                      </Button>
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