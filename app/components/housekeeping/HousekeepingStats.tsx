// src/components/housekeeping/HousekeepingStats.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Staff, Room } from "@/app/lib/types";
import {
  BedDouble,
  Clock,
  CheckCircle,
  Timer,
  Users,
  Loader2,
  Filter,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HousekeepingStatsProps {
  camareras: Staff[];
  habitaciones: Room[];
  estadisticasGlobales: any;
  loading: boolean;
}

export function HousekeepingStats({
  camareras,
  habitaciones,
  estadisticasGlobales,
  loading,
}: HousekeepingStatsProps) {
  const [filtroTipoHabitacion, setFiltroTipoHabitacion] =
    useState<string>("todas");
  const [vistaActiva, setVistaActiva] = useState<string>("tipo");

  // Obtener los tipos únicos de habitaciones
  const tiposHabitacion = Array.from(
    new Set((habitaciones || []).map((h) => h.type))
  ).filter(Boolean);

  // Filtrar habitaciones por tipo
  const habitacionesFiltradas =
    filtroTipoHabitacion === "todas"
      ? habitaciones || []
      : (habitaciones || []).filter((h) => h.type === filtroTipoHabitacion);

  // Calcular estadísticas por tipo de limpieza
  const calcularEstadisticasPorTipo = () => {
    const stats = {
      checkout: {
        total: 0,
        tiempoPromedio: 0,
        completadas: 0,
        enProgreso: 0,
      },
      occupied: {
        total: 0,
        tiempoPromedio: 0,
        completadas: 0,
        enProgreso: 0,
      },
      touch: {
        total: 0,
        tiempoPromedio: 0,
        completadas: 0,
        enProgreso: 0,
      },
      clean_occupied: {
        total: 0,
        tiempoPromedio: 0,
        completadas: 0,
        enProgreso: 0,
      },
      checkout_today: {
        total: 0,
        tiempoPromedio: 0,
        completadas: 0,
        enProgreso: 0,
      },
    };
    
    // Cargar datos de cleaningStats si están disponibles en las habitaciones
    if (habitacionesFiltradas && Array.isArray(habitacionesFiltradas)) {
      // Primera pasada: contar habitaciones y estados
      habitacionesFiltradas.forEach((hab) => {
        // Checkout
        if (hab.status === "cleaning_checkout" || hab.status === "checkout" || 
            (hab.cleaningStats?.esLimpiezaCheckout)) {
          stats.checkout.total++;
          if (hab.status === "cleaning_checkout") stats.checkout.enProgreso++;
          
          // Si tiene estadísticas guardadas para checkout
          if (hab.cleaningStats?.esLimpiezaCheckout && hab.cleaningStats?.lastCleaningTime) {
            stats.checkout.tiempoPromedio += hab.cleaningStats.lastCleaningTime;
            stats.checkout.completadas++;
          } else if (hab.tiempoLimpieza && hab.cleaningStats?.lastCleaningType?.includes('checkout')) {
            stats.checkout.tiempoPromedio += hab.tiempoLimpieza;
            stats.checkout.completadas++;
          }
        }
        // Checkout hoy
        else if (hab.status === "checkout_today") {
          stats.checkout_today.total++;
          stats.checkout_today.enProgreso++;
          if (hab.tiempoLimpieza && hab.cleaningStats?.lastCleaningType?.includes('checkout')) {
            stats.checkout_today.tiempoPromedio += hab.tiempoLimpieza;
            stats.checkout_today.completadas++;
          }
        }
        // Limpieza ocupada
        else if (hab.status === "cleaning_occupied") {
          stats.occupied.total++;
          stats.occupied.enProgreso++;
          if (hab.tiempoLimpieza && hab.cleaningStats?.lastCleaningType?.includes('occupied')) {
            stats.occupied.tiempoPromedio += hab.tiempoLimpieza;
            stats.occupied.completadas++;
          }
        }
        // Limpia ocupada (habitación que ha pasado más de un día desde su limpieza)
        else if (hab.status === "clean_occupied") {
          stats.clean_occupied.total++;

          // Verificar si ha pasado más de 1 día desde el último cambio de estado
          if (hab.lastStatusChange) {
            const lastStatusChangeDate = hab.lastStatusChange.toDate();
            const hoy = new Date();
            const unDiaEnMs = 24 * 60 * 60 * 1000;

            if (hoy.getTime() - lastStatusChangeDate.getTime() > unDiaEnMs) {
              stats.clean_occupied.enProgreso++;
            }
          }

          if (hab.tiempoLimpieza && hab.cleaningStats?.lastCleaningType?.includes('occupied')) {
            stats.clean_occupied.tiempoPromedio += hab.tiempoLimpieza;
            stats.clean_occupied.completadas++;
          }
        }
        // Retoque
        else if (hab.status === "cleaning_touch") {
          stats.touch.total++;
          stats.touch.enProgreso++;
          if (hab.tiempoLimpieza && hab.cleaningStats?.lastCleaningType?.includes('touch')) {
            stats.touch.tiempoPromedio += hab.tiempoLimpieza;
            stats.touch.completadas++;
          }
        }
        
        // También verificar si hay estadísticas de cleanings almacenadas
        if (hab.cleaningStats) {
          const type = hab.cleaningStats.lastCleaningType;
          
          if (type?.includes('checkout') && !stats.checkout.completadas && hab.cleaningStats.lastCleaningTime) {
            stats.checkout.tiempoPromedio += hab.cleaningStats.lastCleaningTime;
            stats.checkout.completadas++;
          } else if (type?.includes('occupied') && !stats.occupied.completadas && hab.cleaningStats.lastCleaningTime) {
            stats.occupied.tiempoPromedio += hab.cleaningStats.lastCleaningTime;
            stats.occupied.completadas++;
          } else if (type?.includes('touch') && !stats.touch.completadas && hab.cleaningStats.lastCleaningTime) {
            stats.touch.tiempoPromedio += hab.cleaningStats.lastCleaningTime;
            stats.touch.completadas++;
          }
        }
      });
    }

    // Calcular promedios
    [
      "checkout",
      "occupied",
      "touch",
      "clean_occupied",
      "checkout_today",
    ].forEach((tipo) => {
      if (stats[tipo as keyof typeof stats].completadas > 0) {
        stats[tipo as keyof typeof stats].tiempoPromedio =
          stats[tipo as keyof typeof stats].tiempoPromedio /
          stats[tipo as keyof typeof stats].completadas;
      }
    });
    
    console.log("Estadísticas calculadas:", stats);
    return stats;
  };

  // Calcular estadísticas por tipo de habitación
  const calcularEstadisticasPorTipoHabitacion = () => {
    const statsPorTipo: Record<
      string,
      { total: number; tiempoPromedio: number; completadas: number }
    > = {};

    // Inicializar el objeto con todos los tipos de habitaciones
    tiposHabitacion.forEach((tipo) => {
      if (tipo) {
        statsPorTipo[tipo] = { total: 0, tiempoPromedio: 0, completadas: 0 };
      }
    });

    // Calcular estadísticas
    if (habitaciones && Array.isArray(habitaciones)) {
      habitaciones.forEach((hab) => {
        if (hab.type && statsPorTipo[hab.type]) {
          statsPorTipo[hab.type].total++;

          // Verificar si tenemos datos de limpieza específicos para este tipo
          if (hab.cleaningStats?.lastCleaningTime) {
            statsPorTipo[hab.type].tiempoPromedio += hab.cleaningStats.lastCleaningTime;
            statsPorTipo[hab.type].completadas++;
          } else if (hab.tiempoLimpieza) {
            statsPorTipo[hab.type].tiempoPromedio += hab.tiempoLimpieza;
            statsPorTipo[hab.type].completadas++;
          }
        }
      });
    }

    // Consultar tiempos almacenados en métricas de staff también
    // Esta sección podría extenderse para hacer una consulta directa a la colección housekeeping_stats
    // para obtener datos más precisos por tipo de habitación
    
    // Calcular promedios
    Object.keys(statsPorTipo).forEach((tipo) => {
      if (statsPorTipo[tipo].completadas > 0) {
        statsPorTipo[tipo].tiempoPromedio =
          statsPorTipo[tipo].tiempoPromedio / statsPorTipo[tipo].completadas;
      }
    });

    console.log("Estadísticas por tipo de habitación:", statsPorTipo);
    return statsPorTipo;
  };

  const estadisticasPorTipo = calcularEstadisticasPorTipo();
  const estadisticasPorTipoHabitacion = calcularEstadisticasPorTipoHabitacion();

  // Datos para el gráfico de barras de tiempos promedio por tipo de limpieza
  const tiemposPromedioData = [
    {
      name: "Check-out",
      tiempo: Math.round(estadisticasPorTipo.checkout.tiempoPromedio || 0),
      color: "#ef4444",
    },
    {
      name: "Check-out Hoy",
      tiempo: Math.round(
        estadisticasPorTipo.checkout_today.tiempoPromedio || 0
      ),
      color: "#f97316",
    },
    {
      name: "Ocupada",
      tiempo: Math.round(estadisticasPorTipo.occupied.tiempoPromedio || 0),
      color: "#3b82f6",
    },
    {
      name: "Limpia Ocupada",
      tiempo: Math.round(
        estadisticasPorTipo.clean_occupied.tiempoPromedio || 0
      ),
      color: "#06b6d4",
    },
    {
      name: "Retoque",
      tiempo: Math.round(estadisticasPorTipo.touch.tiempoPromedio || 0),
      color: "#10b981",
    },
  ];

  // Datos para el gráfico de barras de tiempos promedio por tipo de habitación
  const tiemposPromedioTipoHabitacionData = Object.entries(
    estadisticasPorTipoHabitacion
  ).map(([tipo, stats], index) => ({
    name: tipo,
    tiempo: Math.round(stats.tiempoPromedio || 0),
    total: stats.total,
    color: [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
      "#64748b",
      "#d946ef",
    ][index % 10],
  }));

  // Datos para el gráfico circular de distribución de estados
  const distribucionEstados = [
    {
      name: "Completadas",
      value: estadisticasGlobales?.completadas || 0,
      color: "#10b981",
    },
    {
      name: "En Progreso",
      value: estadisticasGlobales?.enProgreso || 0,
      color: "#3b82f6",
    },
    {
      name: "Pendientes",
      value: estadisticasGlobales?.pendientes || 0,
      color: "#ef4444",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Tabs
          defaultValue="tipo"
          value={vistaActiva}
          onValueChange={setVistaActiva}
          className="w-full md:w-auto"
        >
          <TabsList>
            <TabsTrigger value="tipo">Por Tipo de Limpieza</TabsTrigger>
            <TabsTrigger value="habitacion">Por Tipo de Habitación</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={filtroTipoHabitacion}
            onValueChange={setFiltroTipoHabitacion}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de habitación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {tiposHabitacion.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TabsContent value="tipo" className="mt-0">
        {/* Cards de Resumen por Tipo de Limpieza */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-out</CardTitle>
              <BedDouble className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticasPorTipo.checkout.total}
              </div>
              <div className="text-xs text-gray-500">
                {estadisticasPorTipo.checkout.enProgreso} en progreso
              </div>
              <div className="mt-2 text-sm">
                Promedio:{" "}
                {Math.round(estadisticasPorTipo.checkout.tiempoPromedio || 0)}
                min
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Check-out Hoy
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticasPorTipo.checkout_today.total}
              </div>
              <div className="text-xs text-gray-500">
                {estadisticasPorTipo.checkout_today.enProgreso} en progreso
              </div>
              <div className="mt-2 text-sm">
                Promedio:{" "}
                {Math.round(
                  estadisticasPorTipo.checkout_today.tiempoPromedio || 0
                )}
                min
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupada</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticasPorTipo.occupied.total}
              </div>
              <div className="text-xs text-gray-500">
                {estadisticasPorTipo.occupied.enProgreso} en progreso
              </div>
              <div className="mt-2 text-sm">
                Promedio:{" "}
                {Math.round(estadisticasPorTipo.occupied.tiempoPromedio || 0)}
                min
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Limpia Ocupada
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticasPorTipo.clean_occupied.total}
              </div>
              <div className="text-xs text-gray-500">
                {estadisticasPorTipo.clean_occupied.enProgreso} pendientes
              </div>
              <div className="mt-2 text-sm">
                Promedio:{" "}
                {Math.round(
                  estadisticasPorTipo.clean_occupied.tiempoPromedio || 0
                )}
                min
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retoque</CardTitle>
              <Timer className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticasPorTipo.touch.total}
              </div>
              <div className="text-xs text-gray-500">
                {estadisticasPorTipo.touch.enProgreso} en progreso
              </div>
              <div className="mt-2 text-sm">
                Promedio:{" "}
                {Math.round(estadisticasPorTipo.touch.tiempoPromedio || 0)}min
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Gráfico de Tiempos Promedio */}
          <Card>
            <CardHeader>
              <CardTitle>Tiempos Promedio por Tipo de Limpieza</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tiemposPromedioData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="min" />
                    <Tooltip />
                    <Bar dataKey="tiempo">
                      {tiemposPromedioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Distribución de Estados */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribucionEstados}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {distribucionEstados.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="habitacion" className="mt-0">
        {/* Estadísticas por tipo de habitación */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Tipo de Habitación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tiemposPromedioTipoHabitacionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" unit="min" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="tiempo"
                    name="Tiempo Promedio (min)"
                    radius={[4, 4, 0, 0]}
                  >
                    {tiemposPromedioTipoHabitacionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="right"
                    dataKey="total"
                    name="Total Habitaciones"
                    radius={[4, 4, 0, 0]}
                    fill="#8884d8"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Estadísticas por Tipo de Habitación */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Detalle por Tipo de Habitación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tipo de Habitación
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tiempo Promedio
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Completadas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(estadisticasPorTipoHabitacion).map(
                    ([tipo, stats], index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tipo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stats.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.round(stats.tiempoPromedio || 0)} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stats.completadas}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
}
