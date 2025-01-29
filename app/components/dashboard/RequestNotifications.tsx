// src/components/dashboard/RequestNotifications.tsx
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, MessageSquare, Moon, Paintbrush, Waves } from 'lucide-react';
const requestIcons = {
  'do_not_disturb': <Moon className="h-4 w-4" />,
  'need_cleaning': <Paintbrush className="h-4 w-4" />,
  'need_towels': <Waves className="h-4 w-4" />,
  'guest_request': <MessageSquare className="h-4 w-4" />
};

const requestLabels = {
  'do_not_disturb': 'No Molestar',
  'need_cleaning': 'Solicitud de Limpieza',
  'need_towels': 'Solicitud de Toallas',
  'guest_request': 'Mensaje de Huésped'
};

export function RequestNotifications({ hotelId }) {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
  
    useEffect(() => {
      if (!hotelId) return;
  
      const requestsRef = collection(db, 'hotels', hotelId, 'requests');
      const q = query(requestsRef, orderBy('createdAt', 'desc'));
  
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
  
        setRequests(newRequests);
        setUnreadCount(newRequests.filter(r => r.status === 'pending').length);
      });
  
      return () => unsubscribe();
    }, [hotelId]);
  
    const handleMarkAsAttended = async (request) => {
        try {
          const now = new Date();
          const attendedAt = serverTimestamp();
          
          // Calcular tiempo de respuesta en minutos
          const responseTime = Math.floor((now - request.createdAt) / (1000 * 60));
      
          // 1. Actualizar el estado de la solicitud
          const requestRef = doc(db, 'hotels', hotelId, 'requests', request.id);
          await updateDoc(requestRef, {
            status: 'attended',
            attendedAt,
            attendedBy: {
              id: user.uid,
              name: user.name || 'Usuario'
            },
            responseTime // en minutos
          });
      
          // 2. Registrar en el historial de la habitación
          const historyRef = collection(db, 'hotels', hotelId, 'rooms', request.roomId, 'history');
          await addDoc(historyRef, {
            type: 'request_attended',
            requestType: request.type || 'unknown',
            timestamp: attendedAt,
            attendedBy: {
              id: user.uid,
              name: user.name || 'Usuario'
            },
            responseTime,
            details: {
              requestId: request.id,
              // Solo incluir message si existe
              ...(request.message && { message: request.message }),
              createdAt: request.createdAt
            }
          });
      
        } catch (error) {
          console.error('Error updating request:', error);
        }
      };
  
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold flex items-center">
            Solicitudes de Huéspedes
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500" variant="secondary">
                {unreadCount}
              </Badge>
            )}
          </h2>
        </div>
  
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No hay solicitudes pendientes
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    request.status === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {requestIcons[request.type] || <BellRing className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium">
                        Habitación {request.roomNumber} - {requestLabels[request.type]}
                      </div>
                      {request.message && (
                        <div className="text-sm text-gray-500">{request.message}</div>
                      )}
                      <div className="text-xs text-gray-400">
                        {request.createdAt?.toLocaleString()}
                      </div>
                      {request.status === 'attended' && (
                        <div className="text-xs text-green-600">
                          Atendido por {request.attendedBy?.name} en {request.responseTime} minutos
                        </div>
                      )}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsAttended(request)}
                    >
                      Atendido
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }