'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  History,
  MessageSquare,
  Clock,
  CheckCircle
} from 'lucide-react';
import { RequestCard } from '@/components/hotels/RequestCard';
import MaintenancePreview from '@/components/maintenance/MaintenancePreview';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Room } from '@/app/lib/types';
import { ROOM_STATES } from '@/app/lib/constants/room-states';
import { registrarCambioEstado } from '@/app/services/housekeeping';

export default function StaffRoomView() {
  const params = useParams();
  const { user, staff, checkAccess } = useAuth(); // Obtener staff y checkAccess
  const currentUser = user || staff; // Usar cualquiera que esté disponible
  const [mounted, setMounted] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [procesando, setProcesando] = useState(false);

  const fetchData = async () => {
    if (!params?.hotelId || !params?.roomId) return;

    try {
      setLoading(true);
      const [hotelDoc, roomDoc] = await Promise.all([
        getDoc(doc(db, 'hotels', params.hotelId)),
        getDoc(doc(db, 'hotels', params.hotelId, 'rooms', params.roomId))
      ]);

      if (!hotelDoc.exists() || !roomDoc.exists()) {
        throw new Error('Habitación no encontrada');
      }

      setHotel({ id: hotelDoc.id, ...hotelDoc.data() });
      setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);

      await Promise.all([
        fetchPendingRequests(),
        fetchHistoryEntries()
      ]);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!params?.hotelId || !params?.roomId) return;

    const requestsQuery = query(
      collection(db, 'hotels', params.hotelId, 'requests'),
      where('roomId', '==', params.roomId),
      where('status', '==', 'pending')
    );

    const requestsSnapshot = await getDocs(requestsQuery);
    const requests = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setPendingRequests(requests);
  };

  const fetchHistoryEntries = async () => {
    if (!params?.hotelId || !params?.roomId) return;

    try {
      const historyRef = collection(db, 'hotels', params.hotelId, 'rooms', params.roomId, 'history');
      const historyQuery = query(historyRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(historyQuery);

      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setHistoryEntries(entries);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [params?.hotelId, params?.roomId]);


  const handleStateChange = async (newState: string) => {
    if (!currentUser || !params?.hotelId || !params?.roomId || !room) {
      setErrorMessage('Error: Faltan datos necesarios');
      setShowErrorDialog(true);
      return;
    }
  
    if (newState === 'maintenance' && !notes.trim()) {
      setErrorMessage('Por favor, añade una nota describiendo el problema de mantenimiento');
      setShowErrorDialog(true);
      return;
    }
  
    try {
      setProcesando(true);
  
      // Registrar el cambio de estado usando el ID correcto
      await registrarCambioEstado(
        params.hotelId,
        params.roomId,
        currentUser.id, // Usar id en lugar de uid
        newState,
        notes.trim() || undefined
      );
  
      // Si el estado es mantenimiento, crear una solicitud
      if (newState === 'maintenance') {
        const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
        await addDoc(requestsRef, {
          type: 'maintenance',
          status: 'pending',
          roomId: params.roomId,
          roomNumber: room.number,
          description: notes.trim(),
          createdAt: new Date(),
          createdBy: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role
          },
          priority: 'medium',
          location: `Habitación ${room.number}`,
          category: 'maintenance',
          source: 'staff'
        });
      }
  
      setSuccessMessage('Estado actualizado correctamente');
      setNotes('');
      setRoom(prev => prev ? { ...prev, status: newState } : null);
  
      // Recargar datos actualizados
      await Promise.all([
        fetchPendingRequests(),
        fetchHistoryEntries()
      ]);
  
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error al actualizar el estado');
      setShowErrorDialog(true);
    } finally {
      setProcesando(false);
    }
  };
  const getAvailableStates = () => {
    if (!currentUser || !room) return [];
    let states = [];
  
    // Verificar permisos usando checkAccess
    if (checkAccess('canChangeRoomStatus')) {
      if (currentUser.role === 'housekeeper' || currentUser.role === 'hotel_admin') {
        switch (room.status) {
          case 'available':
          case 'occupied':
          case 'clean_occupied': 
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
            break;
          case 'cleaning_occupied':
            states = ['clean_occupied'];
            break;
          case 'cleaning_checkout':
          case 'cleaning_touch':
            states = ['inspection'];
            break;
          case 'inspection':
            states = ['available'];
            break;
          case 'need_cleaning':
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
            break;
          default:
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
        }
      }
  
      if (currentUser.role === 'maintenance') {
        if (room.status === 'maintenance') {
          states = ['available'];
        }
      }
    }
  
    // Mantenimiento siempre disponible para todo el personal
    states.push('maintenance');
    
    return states;
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              {successMessage && (
                <Alert className="bg-green-100 mb-4">
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {room?.status === 'maintenance' && room?.currentMaintenance && (
                <MaintenancePreview maintenance={room.currentMaintenance} />
              )}

              {pendingRequests.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Solicitudes Pendientes ({pendingRequests.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onComplete={() => {}} // Implementar si es necesario
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Estado Actual: {ROOM_STATES[room?.status]?.label || room?.status}</h3>
                  {room?.tiempoLimpieza && (
                    <div className="text-sm text-gray-600">
                      Último tiempo de limpieza: {room.tiempoLimpieza}min
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {getAvailableStates().map(state => {
                    const stateInfo = ROOM_STATES[state];
                    const StateIcon = stateInfo?.icon || CheckCircle;
                    return (
                      <Button
                        key={state}
                        variant="outline"
                        className={`flex flex-col items-center p-4 h-auto ${stateInfo?.color || ''}`}
                        onClick={() => handleStateChange(state)}
                        disabled={procesando}
                      >
                        <StateIcon className="h-5 w-5" />
                        <span className="mt-2 text-sm font-medium">{stateInfo?.label}</span>
                        {stateInfo?.requiresInspection && (
                          <span className="mt-1 text-xs text-gray-600">
                            Requiere inspección
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="font-medium">
                    Notas {room?.status === 'maintenance' ? '(requerido)' : '(opcional)'}:
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      room?.status === 'maintenance'
                        ? "Describe el problema que requiere mantenimiento..."
                        : "Añade notas adicionales (opcional)..."
                    }
                    className="min-h-[100px]"
                    disabled={procesando}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-left py-2">Estado Anterior</th>
                      <th className="text-left py-2">Nuevo Estado</th>
                      <th className="text-left py-2">Usuario</th>
                      <th className="text-left py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2">
                          {new Date(entry.timestamp.seconds * 1000).toLocaleString()}
                        </td>
                        <td className="py-2">{ROOM_STATES[entry.previousStatus]?.label || entry.previousStatus}</td>
                        <td className="py-2">{ROOM_STATES[entry.newStatus]?.label || entry.newStatus}</td>
                        <td className="py-2">
                          {entry.staffMember?.name}
                          <br />
                          <span className="text-xs text-gray-500">
                            {entry.staffMember?.role}
                            {entry.staffMember?.accessType && ` (${entry.staffMember.accessType})`}
                          </span>
                        </td>
                        <td className="py-2">{entry.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
    </div>
  );
}