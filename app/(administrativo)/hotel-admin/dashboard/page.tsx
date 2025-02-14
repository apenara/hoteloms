"use client";

import React, { useState, useMemo, useEffect, JSX } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  Building,
} from "lucide-react";
import { RoomCard } from "@/components/hotels/RoomCard";
import { NotificationsDialog } from "@/components/dashboard/NotificationsDialog";
import { ROOM_STATES } from "@/app/lib/constants/room-states";
import { User, Room } from "@/app/lib/types";
import { Button } from "@/app/components/ui/button";
import AuthMonitor from "@/app/components/dashboard/AuthMonitor";

const ESTADOS: Record<
  string,
  { label: string; icon: JSX.Element; color: string }
> = Object.entries(ROOM_STATES).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [key]: {
      label: value.label,
      icon: <value.icon className="h-4 w-4" />,
      color: value.color,
    },
  }),
  {}
);

export default function HotelDashboard() {
  const { user } = useAuth() as { user: User | null };
  const [habitaciones, setHabitaciones] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [pisoSeleccionado, setPisoSeleccionado] = useState("todos");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};

    if (user && user.hotelId) {
      try {
        const habitacionesRef = collection(db, "hotels", user.hotelId, "rooms");
        const q = query(habitacionesRef);

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const habitacionesData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Room[];
            setHabitaciones(habitacionesData);
            setIsLoading(false);
          },
          (error) => {
            console.error("Error escuchando cambios:", error);
            setError((error as any).message);
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error("Error al configurar listenerr:", error);
        setError((error as any).message);
        setIsLoading(false);
      }
    }

    return () => unsubscribe();
  }, [user]);

  const contadoresTotales = useMemo(() => {
    return habitaciones.reduce((acc: Record<string, number>, habitacion) => {
      const estado = habitacion.status || "available";
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [habitaciones]);

  const pisosUnicos = useMemo(() => {
    return [...new Set(habitaciones.map((h) => h.floor))].sort((a, b) => a - b);
  }, [habitaciones]);

  const [estadoFiltrado, setEstadoFiltrado] = useState("todos");

  const updateSessionHeartbeat = async () => {
    const sessionId = getCookie('staffAccess');
    if (sessionId) {
      await updateDoc(doc(db, 'hotels', hotelId, 'active_sessions', sessionId), {
        lastHeartbeat: serverTimestamp()
      });
    }
  };

  const habitacionesFiltradas = useMemo(() => {
    // Primero filtramos las habitaciones
    const habitacionesFiltradas = habitaciones.filter((habitacion) => {
      const cumpleFiltoPiso =
        pisoSeleccionado === "todos" ||
        habitacion.floor.toString() === pisoSeleccionado;
      const cumpleBusqueda = habitacion.number
        ?.toLowerCase()
        .includes(busqueda.toLowerCase());
      const cumpleFiltroEstado =
        estadoFiltrado === "todos" || habitacion.status === estadoFiltrado;
      return cumpleFiltoPiso && cumpleBusqueda && cumpleFiltroEstado;
    });

    // Luego ordenamos las habitaciones
    return habitacionesFiltradas.sort((a, b) => {
      // Convertimos los números de habitación a enteros para comparación numérica
      const numA = parseInt(a.number.replace(/\D/g, ''));
      const numB = parseInt(b.number.replace(/\D/g, ''));
      return numA - numB;
    });
  }, [habitaciones, pisoSeleccionado, busqueda, estadoFiltrado]);

  // Calcular contadores por estado
  // const contadores = useMemo(() => {
  //   return habitacionesFiltradas.reduce((acc, habitacion) => {
  //     const estado = habitacion.status || "available";
  //     acc[estado] = (acc[estado] || 0) + 1;
  //     return acc;
  //   }, {});
  // }, [habitacionesFiltradas]);

  return (
    <div className="p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Dashboard Nombre del Hotel{" "}
            <NotificationsDialog hotelId={user?.hotelId} />
          </CardTitle>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar habitación..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={pisoSeleccionado}
                onValueChange={setPisoSeleccionado}
              >
                <SelectTrigger>
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Seleccionar piso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los pisos</SelectItem>
                  {pisosUnicos.map((piso) => (
                    <SelectItem key={piso} value={piso.toString()}>
                      Piso {piso}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4"><AuthMonitor></AuthMonitor></div>
          {/* Contadores de estado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <Card
              key="todos"
              className={`p-2 cursor-pointer transition-all ${
                estadoFiltrado === "todos"
                  ? "ring-2 ring-offset-2 ring-gray-500"
                  : ""
              } bg-gray-100 hover:bg-gray-200`}
              onClick={() => setEstadoFiltrado("todos")}
            >
              <div className="text-center">
                <div className="font-bold">Todas</div>
                <div className="text-2xl font-bold">{habitaciones.length}</div>
              </div>
            </Card>
            {Object.entries(ESTADOS).map(([estado, info]) => (
              <Card
                key={estado}
                className={`${info.color} p-2 cursor-pointer transition-all ${
                  estadoFiltrado === estado
                    ? "ring-2 ring-offset-2"
                    : "hover:opacity-90"
                }`}
                onClick={() => setEstadoFiltrado(estado)}
              >
                <div className="text-center">
                  <div className="font-bold flex items-center justify-center gap-2">
                    {info.icon}
                    {info.label}
                  </div>
                  <div className="text-2xl font-bold">
                    {contadoresTotales[estado] || 0}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Indicador de filtro activo */}
          {estadoFiltrado !== "todos" && (
            <div className="mt-4 flex items-center gap-2">
              <div className="text-sm text-gray-500">
                Mostrando solo habitaciones en estado:{" "}
                <span className="font-bold">
                  {ESTADOS[estadoFiltrado]?.label}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEstadoFiltrado("todos")}
              >
                Mostrar todas
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
            {habitacionesFiltradas.map((habitacion) => (
              <RoomCard
                key={habitacion.id}
                room={habitacion}
                hotelId={user?.hotelId}
                onStatusChange={() => {}} // Ya no necesitamos esto por el tiempo real
                currentUser={user}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
