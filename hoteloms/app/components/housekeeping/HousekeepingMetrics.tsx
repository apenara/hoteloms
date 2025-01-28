// src/components/housekeeping/HousekeepingMetrics.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { Staff, Room } from '@/lib/types';
import { 
  Clock, 
  TrendingUp, 
  Zap, 
  ArrowUpDown,
  BarChart3,
  Timer,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface HousekeepingMetricsProps {
  camareras: Staff[];
  habitaciones: Room[];
  estadisticasGlobales: any;
}

export function HousekeepingMetrics({
  camareras,
  habitaciones,
  estadisticasGlobales
}: HousekeepingMetricsProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('hoy');

  // Calcular KPIs principales
  const calcularKPIs = () => {
    const tiemposLimpieza = habitaciones
      .filter(h => h.tiempoLimpieza && h.tiempoLimpieza > 0)
      .map(h => h.tiempoLimpieza || 0);

    const tiempoTotal = tiemposLimpieza.reduce((acc, curr) => acc + curr, 0);
    const tiempoPromedio = tiemposLimpieza.length > 0 ? tiempoTotal / tiemposLimpieza.length : 0;

    // Calcular retrasos
    const habitacionesRetrasadas = habitaciones.filter(h => {
      if (!h.lastStatusChange || !h.tiempoLimpieza) return false;
      const tiempoEsperado = getTiempoEsperado(h.status);
      return h.tiempoLimpieza > tiempoEsperado;
    });

    return {
      tiempoPromedio,
      eficienciaGlobal: estadisticasGlobales.eficienciaGlobal,
      totalLimpiezas: tiemposLimpieza.length,
      retrasos: habitacionesRetrasadas.length,
      ocupacionCamareras: (camareras.filter(c => 
        habitaciones.some(h => h.assignedTo === c.id)
      ).length / camareras.length) * 100
    };
  };

  // Obtener tiempo esperado según tipo de limpieza
  const getTiempoEsperado = (tipo: string): number => {
    const tiempos = {
      cleaning_checkout: 45,
      cleaning_occupied: 30,
      cleaning_touch: 15,
      default: 30
    };
    return tiempos[tipo as keyof typeof tiempos] || tiempos.default;
  };

  // Calcular eficiencia por camarera
  const getEficienciaPorCamarera = () => {
    return camareras.map(camarera => {
      const habitacionesCamarera = habitaciones.filter(h => h.assignedTo === camarera.id);
      const eficiencia = camarera.efficiency || 0;
      const tiempoPromedio = camarera.tiempoPromedio || 0;

      return {
        nombre: camarera.name,
        eficiencia,
        tiempoPromedio,
        habitaciones: habitacionesCamarera.length,
        color: getColorPorEficiencia(eficiencia)
      };
    }).sort((a, b) => b.eficiencia - a.eficiencia);
  };

  // Función para determinar el color según la eficiencia
  const getColorPorEficiencia = (eficiencia: number): string => {
    if (eficiencia >= 90) return '#10b981';
    if (eficiencia >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const kpis = calcularKPIs();
  const eficienciaPorCamarera = getEficienciaPorCamarera();

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex justify-end">
        <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoy">Hoy</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tiempo Promedio
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(kpis.tiempoPromedio)}min
            </div>
            <div className="text-xs text-muted-foreground">
              Por habitación
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Eficiencia Global
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(kpis.eficienciaGlobal)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {kpis.totalLimpiezas} limpiezas totales
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ocupación Personal
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(kpis.ocupacionCamareras)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {camareras.length} camareras activas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eficiencia por Camarera */}
        <Card>
          <CardHeader>
            <CardTitle>Eficiencia por Camarera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eficienciaPorCamarera}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Bar dataKey="eficiencia">
                    {eficienciaPorCamarera.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tiempo Promedio por Camarera */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo Promedio por Camarera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eficienciaPorCamarera}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis unit="min" />
                  <Tooltip />
                  <Bar dataKey="tiempoPromedio" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Eficiencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {eficienciaPorCamarera.map((camarera, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-gray-500">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{camarera.nombre}</div>
                    <div className="text-sm text-gray-500">
                      {camarera.habitaciones} habitaciones
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {Math.round(camarera.tiempoPromedio)}min
                    </div>
                    <div className="text-sm text-gray-500">
                      promedio
                    </div>
                  </div>
                  <Badge 
                    className={`px-2 py-1 ${
                      camarera.eficiencia >= 90 
                        ? 'bg-green-100 text-green-800'
                        : camarera.eficiencia >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {Math.round(camarera.eficiencia)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}