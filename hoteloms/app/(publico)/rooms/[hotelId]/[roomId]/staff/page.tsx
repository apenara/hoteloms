'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  History,
  ClipboardList,
  CheckCircle2,
  Eye,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { RequestCard } from '@/components/hotels/RequestCard';
import MaintenancePreview from '@/app/components/maintenance/MaintenancePreview';
import { ALLOWED_TRANSITIONS, ROOM_STATES } from '@/app/lib/constants/room-states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

// Estados específicos para el personal de limpieza
const HOUSEKEEPING_STATES = {
  'cleaning_started': {
    label: 'Iniciar Limpieza',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'bg-blue-100 border-blue-500 text-blue-700',
    description: 'Comenzar limpieza de la habitación'
  },
  'cleaning_completed': {
    label: 'Limpieza Terminada',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'bg-green-100 border-green-500 text-green-700',
    description: 'Limpieza finalizada, pendiente de supervisión'
  },
  'ready_for_inspection': {
    label: 'Lista para Inspección',
    icon: <Eye className="h-5 w-5" />,
    color: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    description: 'Habitación lista para ser inspeccionada'
  }
};

// Estado de mantenimiento
const MAINTENANCE_STATE = {
  'maintenance': {
    label: 'Solicitar Mantenimiento',
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'bg-red-100 border-red-500 text-red-700',
    description: 'Se requiere mantenimiento'
  }
};

export default function StaffRoomView() {
  const params = useParams();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [room, setRoom] = useState(null);
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
  }, []); // Este effect solo maneja el mounted

  useEffect(() => {
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
        setRoom({ id: roomDoc.id, ...roomDoc.data() });

        await Promise.all([fetchPendingRequests(), fetchHistoryEntries()]);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params?.hotelId, params?.roomId]); // Este effect maneja la carga de datos

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleStateChange = async (newState) => {
    if (newState === 'maintenance' && !notes.trim()) {
      setErrorMessage('Por favor, añade una nota describiendo el problema de mantenimiento');
      setShowErrorDialog(true);
      return;
    }

    try {
      const timestamp = Timestamp.now();
      const roomRef = doc(db, 'hotels', params.hotelId, 'rooms', params.roomId);

      // Actualizar estado de la habitación
      await updateDoc(roomRef, {
        status: newState,
        lastStatusChange: timestamp,
        lastUpdatedBy: {
          id: user.uid,
          name: user.name,
          role: user.role
        },
        ...(newState === 'maintenance' ? {
          currentMaintenance: {
            status: 'pending',
            description: notes,
            createdAt: Timestamp.now()
          }
        } : {})
      });

      // Si es una solicitud de mantenimiento, crear el registro correspondiente
      if (newState === 'maintenance') {
        const maintenanceRef = collection(db, 'hotels', params.hotelId, 'maintenance');
        await addDoc(maintenanceRef, {
          roomId: params.roomId,
          roomNumber: room.number,
          type: 'corrective',
          status: 'pending',
          priority: 'medium',
          location: `Habitación ${room.number}`,
          description: notes,
          createdAt: Timestamp.now(),
          // Remover scheduledFor aquí, se establecerá cuando se asigne personal
          source: 'room_request',
          requestedBy: {
            id: user.uid,
            name: user.name,
            role: user.role
          }
        });

        // También registrar en requests para la vista de huéspedes
        const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
        await addDoc(requestsRef, {
          roomId: params.roomId,
          roomNumber: room.number,
          type: 'maintenance',
          status: 'pending',
          createdAt: timestamp,
          description: notes,
          requestedBy: {
            id: user.uid,
            name: user.name,
            role: user.role
          }
        });
      }

      // Registrar en el historial
      const historyRef = collection(db, 'hotels', params.hotelId, 'rooms', params.roomId, 'history');
      await addDoc(historyRef, {
        previousStatus: room.status,
        newStatus: newState,
        timestamp,
        notes: notes.trim() || 'Sin notas adicionales',
        staffMember: {
          id: user.uid,
          name: user.name,
          role: user.role,
          accessType: user.accessType || 'email'
        }
      });

      setSuccessMessage('Estado actualizado correctamente');
      setNotes('');
      setRoom(prev => ({ ...prev, status: newState }));

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al actualizar el estado');
    }
  };

  const handleCompleteRequest = async (requestId, completionNotes) => {
    if (!user) return;

    try {
      const timestamp = new Date();
      const requestRef = doc(db, 'hotels', params.hotelId, 'requests', requestId);
      const request = pendingRequests.find(r => r.id === requestId);

      // Actualizar la solicitud
      await updateDoc(requestRef, {
        status: 'completed',
        completedAt: timestamp,
        completedBy: {
          id: user.uid,
          name: user.name,
          role: user.role,
          accessType: user.accessType || 'email'
        },
        completionNotes
      });

      // Registrar en el historial
      const historyRef = collection(db, 'hotels', params.hotelId, 'rooms', params.roomId, 'history');
      await addDoc(historyRef, {
        type: 'request_completed',
        requestId,
        originalRequestType: request?.type,
        timestamp,
        notes: completionNotes || 'Sin notas adicionales',
        staffMember: {
          id: user.uid,
          name: user.name,
          role: user.role,
          accessType: user.accessType || 'email'
        },
        previousStatus: request?.status,
        newStatus: 'completed'
      });

      setSuccessMessage('Solicitud marcada como completada');

      // Actualizar solicitudes pendientes e historial
      await Promise.all([
        fetchPendingRequests(),
        fetchHistoryEntries()
      ]);

    } catch (error) {
      console.error('Error:', error);
      setError('Error al completar la solicitud');
    }
  };

  const getAvailableStates = () => {
    if (!user) return [];
    let states = [];
  
    if (user.role === 'housekeeper' || user.role === 'hotel_admin') {
      switch (room?.status) {
        case 'available':
        case 'occupied':
        case 'clean_occupied': 
          states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
          break;
        case 'cleaning_occupied':
          states = ['clean_occupied'];
          break;
        case 'cleaning_checkout':
          states = ['inspection'];
          break;
        case 'inspection':
          states = ['available'];
          break;
        case 'cleaning_touch':
          states = ['inspection'];
          break;
        case 'need_cleaning':
          states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
          break;
        default:
          states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
      }
    }
  
    if (!states.includes('maintenance')) {
      states.push('maintenance');
    }
    return states;
  };
  // En el render, reemplazar el mapeo de estados
  {
    getAvailableStates().map(state => {
      const stateInfo = ROOM_STATES[state];
      const StateIcon = stateInfo.icon;
      return (
        <Button
          key={state}
          variant="outline"
          className={`flex flex-col items-center p-4 h-auto ${stateInfo.color}`}
          onClick={() => handleStateChange(state)}
        >
          <StateIcon className="h-5 w-5" />
          <span className="mt-2 text-sm font-medium">{stateInfo.label}</span>
          <span className="mt-1 text-xs text-gray-600">
            {stateInfo.requiresInspection ? 'Requiere inspección' : ''}
          </span>
        </Button>
      );
    })
  }

  if (loading) {
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
            Personal: {user?.name} ({user?.role})
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
                        onComplete={handleCompleteRequest}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Estado Actual: {room?.status}</h3>

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
                      >
                        <StateIcon className="h-5 w-5" />
                        <span className="mt-2 text-sm font-medium">{stateInfo?.label}</span>
                        <span className="mt-1 text-xs text-gray-600">
                          {stateInfo?.description}
                        </span>
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
                        <td className="py-2">{entry.previousStatus}</td>
                        <td className="py-2">{entry.newStatus}</td>
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