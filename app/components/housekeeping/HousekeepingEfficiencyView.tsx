// src/components/housekeeping/HousekeepingEfficiencyView.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  Clock,
  Home,
  AlertTriangle,
  TrendingUp, 
  Timer,
  ClipboardList,
} from "lucide-react";
import type { Staff, Room } from "@/app/lib/types";
import { getTiempoTranscurrido } from "@/app/lib/utils/housekeeping";

interface HousekeepingEfficiencyViewProps {
  camareras: Staff[];
  habitaciones: Room[];
  estadisticasGlobales: {
    total?: number;
    completadas: number;
    enProgreso: number;
    pendientes: number;
    inspeccion: number;
    eficienciaGlobal: number;
    tiempoPromedioGlobal: number;
  };
}

const HousekeepingEfficiencyView = ({
  camareras,
  habitaciones,
  estadisticasGlobales,
}: HousekeepingEfficiencyViewProps) => {
  return (
    <div className="space-y-6">
      {/* Resumen Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Total</div>
              <ClipboardList className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl">{estadisticasGlobales.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-green-600">Completadas</div>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl">{estadisticasGlobales.completadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-yellow-600">En Progreso</div>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl">{estadisticasGlobales.enProgreso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-blue-600">Pendientes</div>
              <Home className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl">{estadisticasGlobales.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-purple-600">En Inspección</div>
              <AlertTriangle className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl">{estadisticasGlobales.inspeccion}</div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Eficiencia */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Eficiencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Eficiencia Global
              </div>
              <div className="text-2xl font-bold">
                <Badge
                  className={
                    estadisticasGlobales.eficienciaGlobal > 80
                      ? "bg-green-100 text-green-800"
                      : estadisticasGlobales.eficienciaGlobal > 50
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {estadisticasGlobales.eficienciaGlobal.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Tiempo Promedio Global
              </div>
              <div className="text-2xl font-bold">
                {Math.round(estadisticasGlobales.tiempoPromedioGlobal)} min
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Habitaciones Activas */}
      <Card>
        <CardHeader>
          <CardTitle>Habitaciones en Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Habitación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Camarera</TableHead>
                  <TableHead>Tiempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {habitaciones
                  .filter((h) =>
                    [
                      "cleaning",
                      "cleaning_occupied",
                      "cleaning_checkout",
                      "cleaning_touch",
                    ].includes(h.status)
                  )
                  .map((habitacion) => {
                    const camarera = camareras.find(
                      (c) => c.id === habitacion.assignedTo
                    );
                    return (
                      <TableRow key={habitacion.id}>
                        <TableCell>{habitacion.number}</TableCell>
                        <TableCell>
                          <RoomStatusBadge status={habitacion.status} />
                        </TableCell>
                        <TableCell>{camarera?.name || "No asignada"}</TableCell>
                        <TableCell>
                          {getTiempoTranscurrido(habitacion.lastStatusChange)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

const RoomStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "cleaning_occupied":
        return {
          label: "Limpieza Ocupada",
          className: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        };
      case "cleaning_checkout":
        return {
          label: "Limpieza Checkout",
          className: "bg-purple-100 text-purple-800",
          icon: Home,
        };
      case "cleaning_touch":
        return {
          label: "Retoque",
          className: "bg-blue-100 text-blue-800",
          icon: CheckCircle,
        };
      default:
        return {
          label: "En Limpieza",
          className: "bg-gray-100 text-gray-800",
          icon: Clock,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <div className="flex items-center gap-1">
        <Icon className="w-4 h-4" />
        {config.label}
      </div>
    </Badge>
  );
};

export default HousekeepingEfficiencyView;
