//esta es la pagina publica de las habitaciones, aqui se muestra la informacion de la habitacion y se pueden hacer solicitudes de servicios y mensajes a la recepcion
//tambien se puede acceder a la vista de staff para gestionar la habitacion con un PIN o un login de email
//se importan los hooks de react y de next para la navegacion y los parametros de la url
//se importan los hooks de autenticacion y los componentes de la aplicacion

'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { GuestServices } from '@/app/components/guest/GuestServices';
import { StaffAccessSection } from '@/app/components/guest/StaffAccessSection';
import { MessageDialog } from '@/app/components/guest/MessageDialog';
import { PinLogin } from '@/components/staff/PinLogin';
import StaffLoginDialog from '@/components/staff/StaffLoginDialog';
import { hasPermission } from '@/app/lib/constants/permissions';
import { logAccess } from '@/app/services/access-logs';
import { sendGuestRequestNotification } from '@/app/services/guestNotificationService';
import { Staff, Hotel, Room } from '@/app/lib/types';

/**
 * @function PublicRoomView
 * @description This component renders the public view of a room, accessible to guests.
 * Guests can view room information, request services, and send messages to reception.
 * Staff members can also access this page for specific room management using a PIN or email login.
 * @returns {JSX.Element} The rendered PublicRoomView component.
 */
export default function PublicRoomView() {
  // Hooks
  /**
   * @const router
   * @description The Next.js router instance used for programmatic navigation.
   */
  const router = useRouter();

  /**
   * @const params
   * @description Extracts the dynamic segments `hotelId` and `roomId` from the URL.
   * @type {{ hotelId: string, roomId: string }}
   * @property {string} hotelId - The ID of the hotel.
   * @property {string} roomId - The ID of the room.
   */
  const params = useParams<{ hotelId: string, roomId: string }>();

  /**
   * @const useAuth
   * @description Custom hook that provides authentication-related functionality and the current user if authenticated.
   * @returns {{ user: User | Staff | null }} An object containing the authenticated user or staff member.
   */
  const { user } = useAuth();

  // State variables
  /**
   * @const room
   * @description State variable that stores the data of the current room.
   * @type {Room | null}
   */
  const [room, setRoom] = useState<Room | null>(null);

  /**
   * @const hotel
   * @description State variable that stores the data of the current hotel.
   * @type {Hotel | null}
   */
  const [hotel, setHotel] = useState<Hotel | null>(null);

  /**
   * @const loading
   * @description State variable indicating whether the component is currently fetching data.
   * @type {boolean}
   */
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * @const error
   * @description State variable storing any error that occurred during data fetching or processing.
   * @type {string | null}
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * @const successMessage
   * @description State variable to store a success message to display to the user after an action.
   * @type {string}
   */
  const [successMessage, setSuccessMessage] = useState<string>('');

  /**
   * @const showMessageDialog
   * @description State variable controlling the visibility of the message dialog.
   * @type {boolean}
   */
  const [showMessageDialog, setShowMessageDialog] = useState<boolean>(false);

  /**
   * @const showPinLogin
   * @description State variable controlling the visibility of the PIN login dialog for staff.
   * @type {boolean}
   */
  const [showPinLogin, setShowPinLogin] = useState<boolean>(false);

  /**
   * @const showStaffLogin
   * @description State variable controlling the visibility of the staff email login dialog.
   * @type {boolean}
   */
  const [showStaffLogin, setShowStaffLogin] = useState<boolean>(false);

  /**
   * @const message
   * @description State variable to store the message input by the guest in the message dialog.
   * @type {string}
   */
  const [message, setMessage] = useState<string>('');

  /**
   * @useEffect
   * @description Fetches the room and hotel data when the component mounts or the URL parameters change.
   * @dependency params.hotelId - changes when the hotel id changes
   * @dependency params.roomId - changes when the room id changes
   * @returns {void}
   */
  useEffect(() => {
    const fetchRoomData = async () => {
      // Check if hotelId and roomId are present
      if (!params?.hotelId || !params?.roomId) return;

      try {
        setLoading(true);

        // Fetch hotel data
        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (!hotelDoc.exists()) {
          throw new Error('Hotel no encontrado');
        }
        setHotel({ id: hotelDoc.id, ...hotelDoc.data() } as Hotel);

        // Fetch room data
        const roomDoc = await getDoc(doc(db, 'hotels', params.hotelId, 'rooms', params.roomId));
        if (!roomDoc.exists()) {
          throw new Error('Habitación no encontrada');
        }
        setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
      } catch (error: any) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [params.hotelId, params.roomId]);

  /**
   * @function handleStaffAccess
   * @description Handles staff access to the room using a PIN.
   * It verifies if the staff member has the correct permissions and then stores
   * the staff access information, logs the access and redirect to the staff view of the room.
   * @async
   * @param {Staff} staffMember - The staff member data.
   * @returns {Promise<void>}
   */
  const handleStaffAccess = async (staffMember: Staff) => {
    try {
      // Permission check
      if (!hasPermission(staffMember.role, 'canChangeRoomStatus')) {
        throw new Error('No tienes permisos para acceder a esta sección');
      }

      // Staff access object
      const staffAccess = {
        id: staffMember.id,
        userId: staffMember.userId,
        name: staffMember.name,
        role: staffMember.role,
        hotelId: params.hotelId,
        type: 'staff',
        accessType: 'pin',
        timestamp: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem('staffAccess', JSON.stringify(staffAccess));

      // Store in sessionStorage
      sessionStorage.setItem('currentStaffSession', JSON.stringify({
        ...staffAccess,
        sessionStart: new Date().toISOString()
      }));

      // Log access
      await logAccess({
        userId: staffMember.id,
        userName: staffMember.name,
        role: staffMember.role,
        accessType: 'pin',
        hotelId: params.hotelId,
        roomId: params.roomId,
        action: 'room_access'
      });

      // Redirect to staff room view
      router.push(`/rooms/${params.hotelId}/${params.roomId}/staff`);
    } catch (error: any) {
      console.error('Error en acceso de staff:', error);
      setError(error.message);
    }
  };

  /**
   * @function handleLoginSuccess
   * @description Handles the successful login of a staff member using their email.
   * It checks if the user has the right permissions and logs the access.
   * If everything is correct it redirects the user to the staff view of the room.
   * @async
   * @param {object} user - The user's data.
   * @returns {Promise<void>}
   */
  const handleLoginSuccess = async (user: any) => {
    try {
      // Permission check for administrative users
      if (!hasPermission(user.role, 'canAccessOperationalPages')) {
        throw new Error('No tienes permisos para acceder a esta sección');
      }

      // Log access
      await logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        accessType: 'email',
        hotelId: params.hotelId,
        roomId: params.roomId,
        action: 'room_access'
      });

      // Redirect to staff room view
      router.push(`/rooms/${params.hotelId}/${params.roomId}/staff`);
    } catch (error: any) {
      console.error('Error en login:', error);
      setError(error.message);
    }
  };

  /**
   * @function handleMessageSubmit
   * @description Handles the submission of a message from the guest to the reception.
   * It stores the message as a new request in Firestore and sends a notification to the staff.
   * @async
   * @returns {Promise<void>}
   */
  const handleMessageSubmit = async () => {
    // Check if the message is empty or the data is missing
    if (!message.trim() || !params?.hotelId || !params?.roomId || !room) return;

    try {
      // Create request
      const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
      await addDoc(requestsRef, {
        roomId: params.roomId,
        roomNumber: room.number,
        message,
        status: 'pending',
        createdAt: new Date(),
        type: 'guest_request'
      });

      // Send notification
      await sendGuestRequestNotification({
        type: 'guest_request',
        hotelId: params.hotelId,
        roomNumber: room.number,
        roomId: params.roomId,
        message: message.substring(0, 100)
      });

      // Reset state and show success message
      setMessage('');
      setShowMessageDialog(false);
      setSuccessMessage('Mensaje enviado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setError('Error al enviar el mensaje');
    }
  };

  /**
   * @description Conditional rendering for loading state
   * Show a loading indicator when data is being fetched.
   */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  /**
   * @description Conditional rendering for error state
   * Show an error message when something goes wrong.
   */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /**
   * @description Conditional rendering for null values
   * If hotel or room does not exist will return null.
   */
  if (!room || !hotel) return null;

  /**
   * @description Main component render.
   * If there is no error, and the data has been loaded.
   */
  return (
    <div className="p-4 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{hotel.name} - Habitación {room.number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success message alert */}
          {successMessage && (
            <Alert className="mb-4 bg-green-100">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          {/* Component for Guest Services */}
          <GuestServices
            room={room}
            hotelId={params.hotelId}
            roomId={params.roomId}
            onShowMessage={() => setShowMessageDialog(true)}
            onSuccess={(message) => {
              setSuccessMessage(message);
              setTimeout(() => setSuccessMessage(''), 3000);
            }}
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Acceso del Personal
              </span>
            </div>
          </div>
          {/* Component for Staff access */}
          <StaffAccessSection
            user={user}
            router={router}
            params={params}
            onPinAccess={() => setShowPinLogin(true)}
            onEmailAccess={() => setShowStaffLogin(true)}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      {/* PIN Login Dialog */}
      <PinLogin
        isOpen={showPinLogin}
        onClose={() => setShowPinLogin(false)}
        onSuccess={handleStaffAccess}
        hotelId={params.hotelId}
      />
      {/* Staff Login Dialog */}
      <StaffLoginDialog
        isOpen={showStaffLogin}
        onClose={() => setShowStaffLogin(false)}
        onSuccess={handleLoginSuccess}
        hotelId={params.hotelId}
      />
      {/* Message Dialog */}
      <MessageDialog
        isOpen={showMessageDialog}
        onClose={() => setShowMessageDialog(false)}
        message={message}
        setMessage={setMessage}
        onSubmit={handleMessageSubmit}
      />
    </div>
  );
}
