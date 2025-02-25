// Esta es la pagina que se muestra a los empleados  para ver los detalles de una habitacion cambiar estados y solicitar mantenimiento
// Se muestra la informacion de la habitacion, solicitudes pendientes y el historial de eventos relacionados con la habitacion
// Los empleados pueden crear nuevas solicitudes de mantenimiento desde esta pagina
// las camareras pueden cambiar el estado de la habitacion 
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MaintenanceDialog from '@/components/maintenance/MaintenanceDialog';
import { RoomDetailsTab } from '@/app/components/staff/RoomDetailsTab';
import { RoomHistoryTab } from '@/app/components/staff/RoomHistoryTab';
import type { Room } from '@/app/lib/types';
import { uploadMaintenanceImages } from '@/app/services/storage';
import { registrarCambioEstado } from '@/app/services/housekeeping';

/**
 * @function StaffRoomView
 * @description This component renders the staff view for a specific room.
 * It provides staff members with detailed room information, pending requests, and a history of events related to the room.
 * Staff can also create new maintenance requests from this page.
 * @returns {JSX.Element} The rendered StaffRoomView component.
 */
export default function StaffRoomView() {
  // Hooks
  /**
   * @const params
   * @description Extracts the `hotelId` and `roomId` parameters from the URL.
   * @type {{ hotelId: string; roomId: string; }}
   * @property {string} hotelId - The ID of the hotel.
   * @property {string} roomId - The ID of the room.
   */
  const params = useParams<{ hotelId: string; roomId: string }>();

  /**
   * @const user
   * @const staff
   * @const checkAccess
   * @description Provides authentication-related data and functions.
   * @type {{ user: User | null; staff: Staff | null; checkAccess: (role: string) => boolean }}
   * @property {User | null} user - The currently logged-in user (if any).
   * @property {Staff | null} staff - The currently logged-in staff member (if any).
   * @property {(role: string) => boolean} checkAccess - Function to verify if the current user or staff has a specific role.
   */
  const { user, staff, checkAccess } = useAuth();
  /**
   * @const currentUser
   * @description This is a merged variable that holds the user or the staff member.
   */
  const currentUser = user || staff;

  // State Variables
  /**
   * @const mounted
   * @description State to track whether the component has been mounted.
   * @type {boolean}
   */
  const [mounted, setMounted] = useState(false);
  /**
   * @const room
   * @description Stores the data of the current room.
   * @type {Room | null}
   */
  const [room, setRoom] = useState<Room | null>(null);
  /**
   * @const hotel
   * @description Stores the data of the hotel where the room is located.
   * @type {object | null}
   */
  const [hotel, setHotel] = useState<any>(null);
  /**
   * @const loading
   * @description Indicates whether data is currently being fetched.
   * @type {boolean}
   */
  const [loading, setLoading] = useState(true);
  /**
   * @const error
   * @description Stores any error that occurs during data fetching or processing.
   * @type {string | null}
   */
  const [error, setError] = useState<string | null>(null);
  /**
   * @const successMessage
   * @description Stores a success message to display to the user.
   * @type {string}
   */
  const [successMessage, setSuccessMessage] = useState<string>('');
  /**
   * @const pendingRequests
   * @description Stores the list of pending requests for the current room.
   * @type {any[]}
   */
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  /**
   * @const historyEntries
   * @description Stores the history entries for the current room.
   * @type {any[]}
   */
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  /**
   * @const activeTab
   * @description Stores the currently active tab ('details' or 'history').
   * @type {'details' | 'history'}
   */
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  /**
   * @const showErrorDialog
   * @description Controls the visibility of the error dialog.
   * @type {boolean}
   */
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  /**
   * @const errorMessage
   * @description Stores the error message to display in the error dialog.
   * @type {string}
   */
  const [errorMessage, setErrorMessage] = useState('');
  /**
   * @const procesando
   * @description Indicates if a maintenance request is currently being processed.
   * @type {boolean}
   */
  const [procesando, setProcesando] = useState(false);
  /**
   * @const showMaintenanceDialog
   * @description Controls the visibility of the maintenance dialog.
   * @type {boolean}
   */
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);

  /**
   * @function fetchData
   * @description Fetches the hotel, room, pending requests, and history entries data from Firestore.
   * @async
   * @returns {Promise<void>}
   */
  const fetchData = async () => {
    if (!params?.hotelId || !params?.roomId) return;

    try {
      setLoading(true);

      // Fetch hotel and room data concurrently
      const [hotelDoc, roomDoc] = await Promise.all([
        getDoc(doc(db, 'hotels', params.hotelId)),
        getDoc(doc(db, 'hotels', params.hotelId, 'rooms', params.roomId))
      ]);

      // Check if documents exist
      if (!hotelDoc.exists() || !roomDoc.exists()) {
        throw new Error('Habitación no encontrada');
      }

      // Set state with fetched data
      setHotel({ id: hotelDoc.id, ...hotelDoc.data() });
      setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);

      // Fetch pending requests and history entries concurrently
      await Promise.all([
        fetchPendingRequests(),
        fetchHistoryEntries()
      ]);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * @function fetchPendingRequests
   * @description Fetches pending requests for the current room from Firestore.
   * @async
   * @returns {Promise<void>}
   */
  const fetchPendingRequests = async () => {
    if (!params?.hotelId || !params?.roomId) return;

    // Create the request query
    const requestsQuery = query(
      collection(db, 'hotels', params.hotelId, 'requests'),
      where('roomId', '==', params.roomId),
      where('status', '==', 'pending')
    );

    // Fetch and set the pending requests
    const requestsSnapshot = await getDocs(requestsQuery);
    const requests = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setPendingRequests(requests);
  };

  /**
   * @function fetchHistoryEntries
   * @description Fetches the history entries for the current room from Firestore.
   * @async
   * @returns {Promise<void>}
   */
  const fetchHistoryEntries = async () => {
    if (!params?.hotelId || !params?.roomId) return;

    try {
      // Get the history reference and order it by timestamp
      const historyRef = collection(db, 'hotels', params.hotelId, 'rooms', params.roomId, 'history');
      const historyQuery = query(historyRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(historyQuery);

      // Set the history entries
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistoryEntries(entries);
    } catch (error: any) {
      console.error('Error al cargar historial:', error);
    }
  };

  /**
   * @useEffect
   * @description This hook does the following:
   * 1. Sets the `mounted` state to true.
   * 2. Calls `fetchData` to start fetching data.
   * @dependency params.hotelId - Changes when the hotelId parameter changes
   * @dependency params.roomId - Changes when the roomId parameter changes
   * @returns {void}
   */
  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [params?.hotelId, params?.roomId]);

  /**
   * @function handleMaintenanceRequest
   * @description Handles the creation of a maintenance request.
   * It creates a new request document in Firestore, optionally uploads images,
   * updates the request document with image URLs, and registers a room state change if needed.
   * @async
   * @param {object} params - The request data
   * @param {string} params.description - The description of the maintenance.
   * @param {string} params.priority - The priority of the maintenance.
   * @param {File[]} params.images - The images to be uploaded.
   * @returns {Promise<void>}
   */
  const handleMaintenanceRequest = async ({
    description,
    priority,
    images
  }: {
    description: string;
    priority: string;
    images: File[];
  }) => {
    // Check required data
    if (!currentUser || !params?.hotelId || !params?.roomId || !room) {
      console.error('Datos incompletos para crear solicitud de mantenimiento', {
        currentUser: !!currentUser,
        hotelId: params?.hotelId,
        roomId: params?.roomId,
        room: !!room
      });
      throw new Error('Faltan datos necesarios para crear la solicitud');
    }

    try {
      // Log the creation process
      console.log('Iniciando creación de solicitud de mantenimiento', {
        hotelId: params.hotelId,
        roomId: params.roomId,
        description,
        priority,
        images: images.length
      });

      setProcesando(true);

      // 1. Create the request to get the ID
      const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
      const timestamp = new Date();

      const requestData = {
        type: 'maintenance',
        status: 'pending',
        roomId: params.roomId,
        roomNumber: room.number,
        description: description,
        createdAt: timestamp,
        createdBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role
        },
        priority,
        location: `Habitación ${room.number}`,
        source: 'staff'
      };

      console.log('Creando documento de solicitud con datos:', requestData);
      const requestDoc = await addDoc(requestsRef, requestData);
      console.log('Documento de solicitud creado con ID:', requestDoc.id);

      // 2. Upload images if any
      if (images.length > 0) {
        console.log(`Subiendo ${images.length} imágenes...`);
        try {
          const imageUrls = await uploadMaintenanceImages(
            params.hotelId,
            params.roomId,
            requestDoc.id,
            images
          );

          console.log('Imágenes subidas con éxito:', imageUrls);

          // 3. Update request with image URLs
          await updateDoc(doc(requestsRef, requestDoc.id), {
            images: imageUrls
          });
          console.log('Documento actualizado con URLs de imágenes');
        } catch (imageError) {
          console.error('Error al subir imágenes:', imageError);
          // Continue even if images fail
        }
      }

      // 4. Change the room status if necessary
      try {
        console.log('Registrando cambio de estado a mantenimiento');
        await registrarCambioEstado(
          params.hotelId,
          params.roomId,
          currentUser.id,
          'maintenance',
          description
        );
        console.log('Estado cambiado correctamente');
      } catch (stateError) {
        console.error('Error al cambiar el estado:', stateError);
        // Continue even if the state change fails
      }

      console.log('Solicitud creada exitosamente');
      setSuccessMessage('Solicitud de mantenimiento creada correctamente');
      await fetchData(); // Reload data

    } catch (error: any) {
      console.error('Error al crear solicitud de mantenimiento:', error);
      throw error;
    } finally {
      setProcesando(false);
    }
  };

  /**
   * @description Conditional rendering for the loading state.
   * Show a loading indicator if the component is still loading.
   */
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  /**
   * @description Conditional rendering for error state.
   * Show an error message if there is an error in the component.
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
   * @description Main component render
   * Render the component if everything is correct.
   */
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {hotel?.hotelName} - Habitación {room?.number}
          </CardTitle>
          <div className="text-sm text-gray-500">
            Personal: {currentUser?.name} ({currentUser?.role})
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tabs for details and history */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
            {/* Details tab */}
            <TabsContent value="details">
              <RoomDetailsTab
                room={room}
                successMessage={successMessage}
                pendingRequests={pendingRequests}
                currentUser={currentUser}
                checkAccess={checkAccess}
                procesando={procesando}
                hotelId={params.hotelId}
                roomId={params.roomId}
                onStateChange={async (newRoom) => {
                  setRoom(newRoom);
                  await fetchData();
                  setSuccessMessage('Estado actualizado correctamente');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
                onShowMaintenanceDialog={() => setShowMaintenanceDialog(true)}
              />
            </TabsContent>
            {/* History tab */}
            <TabsContent value="history">
              <RoomHistoryTab historyEntries={historyEntries} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AlertDescription>{errorMessage}</AlertDescription>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <MaintenanceDialog
        isOpen={showMaintenanceDialog}
        onClose={() => setShowMaintenanceDialog(false)}
        onSubmit={handleMaintenanceRequest}
        loading={procesando}
      />
    </div>
  );
}
