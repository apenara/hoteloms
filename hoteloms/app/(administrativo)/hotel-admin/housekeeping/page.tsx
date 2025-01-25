"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import HousekeepingEfficiencyView from '@/components/housekeeping/HousekeepingEfficiencyView'; 
import {collection, query, getDocs, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Clock, CheckCircle2, Home, Briefcase, Trash2 } from 'lucide-react';

const ESTADOS_HOUSEKEEPING = {
  'iniciando': { 
    color: 'bg-blue-100 text-blue-800', 
    icon: Clock,
    label: 'Iniciando Limpieza'
  },
  'ocupado': { 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: Briefcase,
    label: 'Limpieza Ocupada'
  },
  'checkout': { 
    color: 'bg-purple-100 text-purple-800', 
    icon: Home,
    label: 'Limpieza Check Out'
  },
  'publicas': { 
    color: 'bg-orange-100 text-orange-800', 
    icon: Trash2,
    label: 'Áreas Públicas'
  }
};

function TarjetaCamarera({ camarera, habitacionesAsignadas = [] }) {
  const IconoEstado = ESTADOS_HOUSEKEEPING[camarera.estado]?.icon;
  const habitacionesHoy = habitacionesAsignadas.filter(h => {
    const hoy = new Date();
    const fecha = new Date(h.lastStatusChange.seconds * 1000);
    return fecha.toDateString() === hoy.toDateString();
  });

  const calcularEficiencia = () => {
    if (!habitacionesHoy.length) return 0;
    const completadas = habitacionesHoy.filter(h => h.status === 'available').length;
    return Math.round((completadas / habitacionesHoy.length) * 100);
  };

  const habitacionActual = habitacionesAsignadas.find(h => h.status === 'cleaning');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">{camarera.name}</CardTitle>
          <Badge variant="secondary" className={ESTADOS_HOUSEKEEPING[camarera.estado]?.color}>
            {IconoEstado && <IconoEstado className="w-4 h-4 mr-1" />}
            {ESTADOS_HOUSEKEEPING[camarera.estado]?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Habitaciones Hoy</span>
            <span className="text-xl font-semibold">{habitacionesHoy.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Eficiencia</span>
            <span className="text-xl font-semibold">{calcularEficiencia()}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Habitación Actual</span>
            <span className="text-xl font-semibold">{habitacionActual?.number || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Tiempo Promedio</span>
            <span className="text-xl font-semibold">
              {Math.round(camarera.tiempoPromedio || 0)}min
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HousekeepingPage() {
  const { user } = useAuth();
  const [camareras, setCamareras] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroActual, setFiltroActual] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);

  const fetchData = async () => {
    if (!user?.hotelId) return;

    try {
      // Obtener camareras
      const staffRef = collection(db, 'hotels', user.hotelId, 'staff');
      const staffQuery = query(
        staffRef, 
        where('role', '==', 'housekeeper'),
        orderBy('name')
      );
      const staffSnap = await getDocs(staffQuery);
      const staffData = staffSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCamareras(staffData);

      // Obtener habitaciones en limpieza
      const roomsRef = collection(db, 'hotels', user.hotelId, 'rooms');
      const roomsQuery = query(
        roomsRef,
        where('status', 'in', ['cleaning', 'need_cleaning', 'checkout'])
      );
      const roomsSnap = await getDocs(roomsQuery);
      const roomsData = roomsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHabitaciones(roomsData);
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getHabitacionesPorCamarera = (camareraId) => {
    return habitaciones.filter(h => h.assignedTo === camareraId);
  };

  const camarasFiltradas = camareras
    .filter(c => filtroActual === 'todos' || c.estado === filtroActual)
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Housekeeping</CardTitle>
            <Badge variant="outline" className="text-lg">
              {camareras.length} Camareras en turno
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <HousekeepingEfficiencyView camareras={camareras} habitaciones={habitaciones} />
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={filtroActual} onValueChange={setFiltroActual}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              {Object.entries(ESTADOS_HOUSEKEEPING).map(([estado, info]) => (
                <TabsTrigger key={estado} value={estado}>
                  <info.icon className="w-4 h-4 mr-2" />
                  {info.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={filtroActual} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {camarasFiltradas.map((camarera) => (
                  <TarjetaCamarera
                    key={camarera.id}
                    camarera={camarera}
                    habitacionesAsignadas={getHabitacionesPorCamarera(camarera.id)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}