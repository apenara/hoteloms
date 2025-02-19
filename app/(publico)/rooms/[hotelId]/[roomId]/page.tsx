'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Moon, Paintbrush, Waves, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useParams, useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { useAuth } from '@/lib/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Label } from '@/components/ui/label';
import { PinLogin } from '@/components/staff/PinLogin';
import StaffLoginDialog from '@/components/staff/StaffLoginDialog';
import { logAccess } from '@/app/services/access-logs';
import { hasPermission } from '@/app/lib/constants/permissions';
import { sendGuestRequestNotification } from '@/app/services/guestNotificationService';


export default function PublicRoomView() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para diálogos
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);

  // Estado para el mensaje
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!params?.hotelId || !params?.roomId) return;

      try {
        setLoading(true);
        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (!hotelDoc.exists()) {
          throw new Error('Hotel no encontrado');
        }
        setHotel({ id: hotelDoc.id, ...hotelDoc.data() });

        const roomDoc = await getDoc(doc(db, 'hotels', params.hotelId, 'rooms', params.roomId));
        if (!roomDoc.exists()) {
          throw new Error('Habitación no encontrada');
        }
        setRoom({ id: roomDoc.id, ...roomDoc.data() });
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [params]);

  const handleStaffAccess = async (staffMember) => {
    try {
      // Verificar permisos básicos
      if (!hasPermission(staffMember.role, 'canChangeRoomStatus')) {
        throw new Error('No tienes permisos para acceder a esta sección');
      }

      // Crear el objeto de acceso
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

      // Guardar en localStorage
      localStorage.setItem('staffAccess', JSON.stringify(staffAccess));

      // Guardar en sessionStorage
      sessionStorage.setItem('currentStaffSession', JSON.stringify({
        ...staffAccess,
        sessionStart: new Date().toISOString()
      }));

      // Registrar el acceso
      await logAccess({
        userId: staffMember.id,
        userName: staffMember.name,
        role: staffMember.role,
        accessType: 'pin',
        hotelId: params.hotelId,
        roomId: params.roomId,
        action: 'room_access'
      });

      // Redireccionar
      window.location.href = `/rooms/${params.hotelId}/${params.roomId}/staff`;
    } catch (error) {
      console.error('Error en acceso de staff:', error);
      setError(error.message);
    }
  };

  const handleLoginSuccess = async (user) => {
    try {
      // Verificar permisos para usuarios administrativos
      if (!hasPermission(user.role, 'canAccessOperationalPages')) {
        throw new Error('No tienes permisos para acceder a esta sección');
      }

      // Registrar el acceso
      await logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        accessType: 'email',
        hotelId: params.hotelId,
        roomId: params.roomId,
        action: 'room_access'
      });

      // Redireccionar
      window.location.href = `/rooms/${params.hotelId}/${params.roomId}/staff`;
    } catch (error) {
      console.error('Error en login:', error);
      setError(error.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!params?.hotelId || !params?.roomId) return;
  
    try {
      const timestamp = new Date();
      const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
  
      // Crear solicitud con más detalles
      await addDoc(requestsRef, {
        roomId: params.roomId,
        roomNumber: room?.number,
        type: newStatus,
        status: 'pending',
        createdAt: timestamp,
        source: 'guest',
        priority: newStatus === 'need_cleaning' ? 'high' : 'medium',
        details: {
          previousStatus: room?.status,
          requestType: 'guest_initiated',
          guestRequest: true
        }
      });
  
      // Registrar en historial
      const historyRef = collection(db, 'hotels', params.hotelId, 'rooms', params.roomId, 'history');
      await addDoc(historyRef, {
        type: 'guest_request',
        requestType: newStatus,
        timestamp,
        source: 'guest',
        notes: `Solicitud de huésped: ${newStatus}`,
        room: {
          number: room?.number,
          id: room?.id
        }
      });

        // Enviar notificación
    await sendGuestRequestNotification({
      type: newStatus,
      hotelId: params.hotelId,
      roomNumber: room.number,
      roomId: params.roomId
    });
  
      setSuccessMessage('Solicitud enviada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
  
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar la solicitud');
    }
  };
  const handleMessageSubmit = async () => {
    if (!message.trim() || !params?.hotelId || !params?.roomId) return;

    try {
      const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
      await addDoc(requestsRef, {
        roomId: params.roomId,
        roomNumber: room?.number,
        message,
        status: 'pending',
        createdAt: new Date(),
        type: 'guest_request'
      });

       // Enviar notificación
    await sendGuestRequestNotification({
      type: 'guest_request',
      hotelId: params.hotelId,
      roomNumber: room.number,
      roomId: params.roomId,
      message: message.substring(0, 100) // Primeros 100 caracteres del mensaje
    });

      setMessage('');
      setShowMessageDialog(false);
      setSuccessMessage('Mensaje enviado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al enviar el mensaje');
    }
  };

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!room || !hotel) return null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{hotel.hotelName} - Habitación {room.number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage && (
            <Alert className="mb-4 bg-green-100">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              className="flex flex-col items-center p-6 h-auto"
              variant="outline"
              onClick={() => handleStatusChange('need_cleaning')}
            >
              <Paintbrush className="h-8 w-8 mb-2" />
              <span>Solicitar Limpieza</span>
              <span className="text-xs text-gray-500 mt-1">
                Servicio de limpieza
              </span>
            </Button>

            <Button
              className="flex flex-col items-center p-6 h-auto"
              variant="outline"
              onClick={() => handleStatusChange('need_towels')}
            >
              <Waves className="h-8 w-8 mb-2" />
              <span>Solicitar Toallas</span>
              <span className="text-xs text-gray-500 mt-1">
                Toallas adicionales
              </span>
            </Button>

            <Button
              className="flex flex-col items-center p-6 h-auto col-span-2"
              variant="outline"
              onClick={() => setShowMessageDialog(true)}
            >
              <MessageSquare className="h-8 w-8 mb-2" />
              <span>Enviar Mensaje</span>
              <span className="text-xs text-gray-500 mt-1">
                Contactar a recepción
              </span>
            </Button>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setShowPinLogin(true)}
            >
              Acceso con PIN
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowStaffLogin(true)}
            >
              Acceso con Email
            </Button>
          </div>

          {user && (
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => router.push(`/rooms/${params.hotelId}/${params.roomId}/staff`)}
            >
              Acceder a Opciones del Personal
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <PinLogin
        isOpen={showPinLogin}
        onClose={() => setShowPinLogin(false)}
        onSuccess={handleStaffAccess}
        hotelId={params.hotelId}
      />

      <StaffLoginDialog
        isOpen={showStaffLogin}
        onClose={() => setShowStaffLogin(false)}
        onSuccess={handleLoginSuccess}
        hotelId={params.hotelId}
      />

      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar mensaje a recepción</DialogTitle>
            <DialogDescription>
              Escriba su mensaje y lo atenderemos lo antes posible
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Escriba su mensaje aquí..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMessageSubmit}>
                Enviar Mensaje
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}