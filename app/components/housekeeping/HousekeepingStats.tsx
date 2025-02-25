// src/components/housekeeping/HousekeepingStats.tsx
import React from "react";
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
} from "recharts";
import type { Staff, Room } from "@/app/lib/types";
import { BedDouble, Clock, CheckCircle, Timer, Users, Loader2 } from "lucide-react";

interface HousekeepingStatsProps {
  camareras: Staff[];
  habitaciones: Room[];
  estadisticasGlobales: any;
  loading:boolean;
}

export function HousekeepingStats({
  camareras,
  habitaciones,
  estadisticasGlobales,
  loading
}: HousekeepingStatsProps) {
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
    };

    // Check if habitaciones exists and is an array before using forEach
    if (habitaciones && Array.isArray(habitaciones)) {
      habitaciones.forEach((hab) => {
        if (
          hab.status === "cleaning_checkout" ||
          hab.lastStatusChange?.toDate().toDateString() ===
            new Date().toDateString()
        ) {
          stats.checkout.total++;
          if (hab.status === "cleaning_checkout") stats.checkout.enProgreso++;
          if (hab.tiempoLimpieza) {
            stats.checkout.tiempoPromedio += hab.tiempoLimpieza;
            stats.checkout.completadas++;
          }
        } else if (hab.status === "cleaning_occupied") {
          stats.occupied.total++;
          stats.occupied.enProgreso++;
          if (hab.tiempoLimpieza) {
            stats.occupied.tiempoPromedio += hab.tiempoLimpieza;
            stats.occupied.completadas++;
          }
        } else if (hab.status === "cleaning_touch") {
          stats.touch.total++;
          stats.touch.enProgreso++;
          if (hab.tiempoLimpieza) {
            stats.touch.tiempoPromedio += hab.tiempoLimpieza;
            stats.touch.completadas++;
          }
        }
      });
    }

    // Calcular promedios
    ["checkout", "occupied", "touch"].forEach((tipo) => {
      if (stats[tipo as keyof typeof stats].completadas > 0) {
        stats[tipo as keyof typeof stats].tiempoPromedio =
          stats[tipo as keyof typeof stats].tiempoPromedio /
          stats[tipo as keyof typeof stats].completadas;
      }
    });

    return stats;
  };

  const estadisticasPorTipo = calcularEstadisticasPorTipo();

  // Datos para el gráfico de barras de tiempos promedio
  const tiemposPromedioData = [
    {
      name: "Check-out",
      tiempo: Math.round(estadisticasPorTipo.checkout.tiempoPromedio || 0),
      color: "#ef4444",
    },
    {
      name: "Ocupada",
      tiempo: Math.round(estadisticasPorTipo.occupied.tiempoPromedio || 0),
      color: "#3b82f6",
    },
    {
      name: "Retoque",
      tiempo: Math.round(estadisticasPorTipo.touch.tiempoPromedio || 0),
      color: "#10b981",
    },
  ];

  // Datos para el gráfico circular de distribución de estados
  const distribucionEstados = [
    {
      name: "Completadas",
      value: estadisticasGlobales.completadas,
      color: "#10b981",
    },
    {
      name: "En Progreso",
      value: estadisticasGlobales.enProgreso,
      color: "#3b82f6",
    },
    {
      name: "Pendientes",
      value: estadisticasGlobales.pendientes,
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
      {/* Cards de Resumen por Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {Math.round(estadisticasPorTipo.checkout.tiempoPromedio || 0)}min
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
              {Math.round(estadisticasPorTipo.occupied.tiempoPromedio || 0)}min
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Tiempos Promedio */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempos Promedio por Tipo</CardTitle>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
