"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  BedDouble, 
  Paintbrush, 
  AlertTriangle, 
  CheckCircle, 
  Users 
} from 'lucide-react';
import { useRealTimeHousekeeping } from '@/app/hooks/useRealTimeHousekeeping';
import { ROOM_STATES } from '@/app/lib/constants/room-states';

const HousekeepingTVDashboard = ({ hotelId }) => {
  const { habitaciones, camareras, estadisticasGlobales, loading } = useRealTimeHousekeeping({ hotelId });
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    if (!hotelId) return;

    const requestsRef = collection(db, 'hotels', hotelId, 'requests');
    const q = query(
      requestsRef, 
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nuevasNotificaciones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotificaciones(nuevasNotificaciones);
    });

    return () => unsubscribe();
  }, [hotelId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 p-4 h-screen bg-gray-100">
      {/* Panel Principal */}
      <div className="col-span-8 space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Estado de Habitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-4">
              {habitaciones.map((habitacion) => (
                <div
                  key={habitacion.id}
                  className={`p-4 rounded-lg ${ROOM_STATES[habitacion.status]?.color || 'bg-gray-100'}`}
                >
                  <div className="text-xl font-bold">{habitacion.number}</div>
                  <div className="text-sm">{ROOM_STATES[habitacion.status]?.label}</div>
                  {habitacion.assignedTo && (
                    <div className="text-xs mt-1">
                      {camareras.find(c => c.id === habitacion.assignedTo)?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel Lateral */}
      <div className="col-span-4 space-y-4">
        {/* Métricas */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-sm text-gray-500">Completadas</div>
                    <div className="text-2xl font-bold">{estadisticasGlobales.completadas}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-sm text-gray-500">En Progreso</div>
                    <div className="text-2xl font-bold">{estadisticasGlobales.enProgreso}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-sm text-gray-500">Pendientes</div>
                    <div className="text-2xl font-bold">{estadisticasGlobales.pendientes}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-sm text-gray-500">Personal Activo</div>
                    <div className="text-2xl font-bold">{camareras.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Notificaciones
              {notificaciones.length > 0 && (
                <Badge variant="destructive">{notificaciones.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {notificaciones.map((notificacion) => (
                <div
                  key={notificacion.id}
                  className="p-3 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <div className="font-medium">
                    Habitación {notificacion.roomNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    {notificacion.message || notificacion.type}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(notificacion.createdAt?.seconds * 1000).toLocaleString()}
                  </div>
                </div>
              ))}
              {notificaciones.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No hay notificaciones pendientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HousekeepingTVDashboard;