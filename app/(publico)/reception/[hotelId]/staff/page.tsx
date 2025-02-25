// Este es el cuadro de control principal para el personal de recepción.
// Permite a los recepcionistas ver el estado de las habitaciones, gestionar las solicitudes de los huéspedes y manejar las operaciones del hotel.
// Obtiene los datos del hotel, las habitaciones y las solicitudes de Firestore y las representa en una interfaz con pestañas.
// Es el centro de mando para el personal de recepción.
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationsDialog } from '@/components/dashboard/NotificationsDialog';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { LogOut } from 'lucide-react';
import { toast } from '@/app/hooks/use-toast';
import { GuestRequestDialog } from '@/app/components/front/GuestRequestDialog';
import { RoomsSection } from '@/app/components/reception/RoomsSection';
import { RequestsSection } from '@/app/components/reception/RequestsSection';
import { Staff, Hotel, Room, Request } from '@/app/lib/types';

/**
 * @function ReceptionStaffPage
 * @description This component serves as the main dashboard for reception staff.
 * It allows receptionists to view room statuses, manage guest requests, and handle hotel operations.
 * It fetches hotel, room, and request data from Firestore and renders them in a tabbed interface.
 * @returns {JSX.Element} The rendered ReceptionStaffPage component.
 */
export default function ReceptionStaffPage() {
  /**
   * @const params
   * @description Extracts the `hotelId` parameter from the URL.
   * @type {object}
   * @property {string} hotelId - The ID of the current hotel.
   */
  const params = useParams<{ hotelId: string }>();

  /**
   * @const staff
   * @const signOut
   * @description Uses the `useAuth` hook to manage user authentication.
   * staff holds the current staff member's data.
   * signOut allows the staff member to log out.
   * @type {{ staff: Staff | null; signOut: () => void }}
   */
  const { staff, signOut } = useAuth() as { staff: Staff | null; signOut: () => void };

  /**
   * @const hotelData
   * @description State to store the hotel's data.
   * @type {Hotel | null}
   */
  const [hotelData, setHotelData] = useState<Hotel | null>(null);
  /**
   * @const rooms
   * @description State to store the list of rooms.
   * @type {Room[]}
   */
  const [rooms, setRooms] = useState<Room[]>([]);
  /**
   * @const requests
   * @description State to store the list of guest requests.
   * @type {Request[]}
   */
  const [requests, setRequests] = useState<Request[]>([]);
  /**
   * @const loading
   * @description State to track if data is currently being loaded.
   * @type {boolean}
   */
  const [loading, setLoading] = useState<boolean>(true);
  /**
   * @const error
   * @description State to store any errors that occur during data fetching or processing.
   * @type {string | null}
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetchHotelData
   * @description Fetches the hotel's data from Firestore based on the `hotelId` in the URL parameters.
   * @async
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (hotelDoc.exists()) {
          setHotelData({ id: hotelDoc.id, ...hotelDoc.data() } as Hotel);
        }
      } catch (error) {
        console.error('Error fetching hotel:', error);
        setError('Error al obtener la informacion del hotel');
      } finally {
        setLoading(false);
      }
    };

    if (params.hotelId) {
      fetchHotelData();
    }
  }, [params.hotelId]);

  /**
   * @useEffect
   * @description This hook does the following:
   * 1. Checks if the staff member is authenticated and has the 'reception' role. If not, it sets an error.
   * 2. Sets up real-time listeners for changes in the 'rooms' and 'requests' collections in Firestore.
   * 3. Updates the `rooms` and `requests` states with the data received from Firestore.
   * @dependency params.hotelId - Changes when the hotelId parameter changes
   * @dependency staff - Changes when the staff authentication status changes
   * @returns {() => void} A cleanup function to unsubscribe from Firestore listeners.
   */
  useEffect(() => {
    // Check if staff member is authenticated and has the right role
    if (!staff || staff.role !== 'reception') {
      setError('Acceso no autorizado');
      return;
    }

    // Subscription to rooms
    const roomsRef = collection(db, 'hotels', params.hotelId, 'rooms');
    const roomsUnsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error('Error:', error);
      setError('Error al cargar los datos de las habitaciones');
      setLoading(false);
    });

    // Subscription to requests
    const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
    const requestsQuery = query(
      requestsRef,
      orderBy('createdAt', 'desc')
    );

    const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Request[];
      setRequests(requestsData);
    });

    // Cleanup function to unsubscribe from listeners
    return () => {
      roomsUnsubscribe();
      requestsUnsubscribe();
    };
  }, [params.hotelId, staff]);

  /**
   * @description Conditional rendering for errors.
   * If there is an error it will show a alert
   */
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /**
   * @description Conditional rendering for loading.
   * If the component is loading it will show a loading indicator.
   */
  if (loading) {
    return <div>Cargando...</div>;
  }

  /**
   * @description Main component render
   * If there is no error and the component has finished loading, it will render the main dashboard.
   */
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                {hotelData?.name || 'Cargando...'}
              </CardTitle>
              <p className="text-sm text-gray-500">
                Usuario: {staff?.name} ({staff?.role})
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Guest Request Dialog */}
              <GuestRequestDialog
                hotelId={params.hotelId}
                rooms={rooms}
                onRequestCreated={() => {
                  toast({
                    title: "Solicitud creada",
                    description: "Se ha creado una nueva solicitud exitosamente"
                  })
                }}
              />
              {/* Notifications Dialog */}
              <NotificationsDialog hotelId={params.hotelId} />
              {/* Logout Button */}
              <Button
                variant="outline"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tabs for Rooms and Requests */}
          <Tabs defaultValue="rooms" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rooms">Habitaciones</TabsTrigger>
              <TabsTrigger value="requests">Solicitudes</TabsTrigger>
            </TabsList>
            {/* Rooms Tab */}
            <TabsContent value="rooms">
              <RoomsSection
                rooms={rooms}
                hotelId={params.hotelId}
                staff={staff}
              />
            </TabsContent>
            {/* Requests Tab */}
            <TabsContent value="requests">
              <RequestsSection
                requests={requests}
                hotelId={params.hotelId}
                staff={staff}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
