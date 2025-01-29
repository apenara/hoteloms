// src/components/housekeeping/HousekeepingStaffList.tsx
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, AlertTriangle, Timer, User } from "lucide-react";
import type { Staff, Room } from "@/app/lib/types";
import { ROOM_STATES } from "@/app/lib/constants/room-states";

interface HousekeepingStaffListProps {
  camareras: Staff[];
  habitaciones: Room[];
  searchTerm: string;
}

// Mover la función getTiempoEsperado fuera del componente y antes de su uso
const getTiempoEsperado = (tipo: string): number => {
  const tiempos = {
    cleaning_checkout: 45,
    cleaning_occupied: 30,
    cleaning_touch: 15,
    default: 30,
  };
  return tiempos[tipo as keyof typeof tiempos] || tiempos.default;
};

export function HousekeepingStaffList({
  camareras,
  habitaciones,
  searchTerm,
}: HousekeepingStaffListProps) {
  // Usar useMemo para calcular datos derivados
  const camarasInfo = useMemo(() => {
    return camareras
      .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((camarera) => {
        // Obtener habitaciones asignadas a esta camarera
        const habitacionesAsignadas = habitaciones.filter(
          (h) => h.assignedTo === camarera.id
        );

        // Obtener habitación actual en limpieza
        const habitacionActual = habitacionesAsignadas.find((h) =>
          ["cleaning_occupied", "cleaning_checkout", "cleaning_touch"].includes(
            h.status
          )
        );

        // Calcular progreso si hay habitación actual
        let progreso = 0;
        if (habitacionActual && habitacionActual.lastStatusChange) {
          const tiempoTranscurrido = Math.floor(
            (new Date().getTime() -
              habitacionActual.lastStatusChange.toDate().getTime()) /
              (1000 * 60)
          );
          const tiempoEsperado = getTiempoEsperado(habitacionActual.status);
          progreso = Math.min(100, (tiempoTranscurrido / tiempoEsperado) * 100);
        }

        // Calcular estadísticas del día
        const habitacionesHoy = habitacionesAsignadas.filter(
          (h) =>
            h.lastStatusChange?.toDate().toDateString() ===
            new Date().toDateString()
        );

        const completadasHoy = habitacionesHoy.filter(
          (h) => h.status === "available"
        ).length;
        const enProgresoHoy = habitacionesHoy.filter((h) =>
          ["cleaning_occupied", "cleaning_checkout", "cleaning_touch"].includes(
            h.status
          )
        ).length;

        return {
          camarera,
          habitacionActual,
          progreso,
          stats: {
            completadas: completadasHoy,
            enProgreso: enProgresoHoy,
            tiempoPromedio: camarera.tiempoPromedio || 0,
          },
        };
      });
  }, [camareras, habitaciones, searchTerm]);

  return (
    <ScrollArea className="h-[600px]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
        {camarasInfo.map(({ camarera, habitacionActual, progreso, stats }) => (
          <Card key={camarera.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              {/* Header con información de la camarera */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{camarera.name}</h3>
                    <p className="text-sm text-gray-500">{camarera.phone}</p>
                  </div>
                </div>
                <Badge
                  className={
                    habitacionActual
                      ? progreso > 100
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }
                >
                  <div className="flex items-center gap-1">
                    {habitacionActual ? (
                      progreso > 100 ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {habitacionActual
                      ? progreso > 100
                        ? "Retrasada"
                        : "En Servicio"
                      : "Disponible"}
                  </div>
                </Badge>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-gray-50 rounded-lg p-2">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-600" />
                  <div className="text-xs text-gray-600">Completadas</div>
                  <div className="font-semibold">{stats.completadas}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                  <div className="text-xs text-gray-600">En Progreso</div>
                  <div className="font-semibold">{stats.enProgreso}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <Timer className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                  <div className="text-xs text-gray-600">Promedio</div>
                  <div className="font-semibold">
                    {Math.round(stats.tiempoPromedio)}min
                  </div>
                </div>
              </div>

              {/* Habitación Actual y Progreso */}
              {habitacionActual && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">
                        Habitación {habitacionActual.number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ROOM_STATES[habitacionActual.status]?.label ||
                          habitacionActual.status}
                      </div>
                    </div>
                    {habitacionActual.lastStatusChange && (
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {Math.floor(
                            (new Date().getTime() -
                              habitacionActual.lastStatusChange
                                .toDate()
                                .getTime()) /
                              (1000 * 60)
                          )}
                          min
                        </div>
                        <div className="text-xs text-gray-500">
                          de {getTiempoEsperado(habitacionActual.status)}min
                        </div>
                      </div>
                    )}
                  </div>

                  <Progress
                    value={progreso}
                    className="h-2"
                    indicatorClassName={
                      progreso > 100
                        ? "bg-red-500"
                        : progreso > 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }
                  />
                </div>
              )}

              {/* Eficiencia Global */}
              <div className="mt-4 text-center">
                <div className="text-sm text-gray-500">Eficiencia Global</div>
                <div className="text-lg font-semibold">
                  {Math.round(camarera.efficiency || 0)}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
