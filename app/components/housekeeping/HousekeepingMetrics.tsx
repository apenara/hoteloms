// src/components/housekeeping/HousekeepingMetrics.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Cell,
  Legend,
} from "recharts";
import type { Staff, Room } from "@/app/lib/types";
import {
  Clock,
  TrendingUp,
  Zap,
  ArrowUpDown,
  BarChart3,
  Timer,
  Activity,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Filter,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";

interface HousekeepingMetricsProps {
  camareras: Staff[];
  habitaciones: Room[];
  estadisticasGlobales: any;
}

export function HousekeepingMetrics({
  camareras,
  habitaciones,
  estadisticasGlobales,
}: HousekeepingMetricsProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("hoy");
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date());
  const [fechaFin, setFechaFin] = useState<Date>(new Date());
  const [vistaPorTipo, setVistaPorTipo] = useState("eficiencia");
  const [filtroTipoHabitacion, setFiltroTipoHabitacion] = useState("todas");

  // Obtener los tipos únicos de habitaciones
  const tiposHabitacion = Array.from(
    new Set((habitaciones || []).map((h) => h.type))
  ).filter(Boolean);

  // Filtrar habitaciones por tipo si es necesario
  const habitacionesFiltradas =
    filtroTipoHabitacion === "todas"
      ? habitaciones || []
      : (habitaciones || []).filter((h) => h.type === filtroTipoHabitacion);

  // Calcular KPIs principales
  const calcularKPIs = () => {
    // Asegurarse de que habitacionesFiltradas sea un array
    const tiemposLimpieza = habitacionesFiltradas
      .filter((h) => h.tiempoLimpieza && h.tiempoLimpieza > 0)
      .map((h) => h.tiempoLimpieza || 0);

    const tiempoTotal = tiemposLimpieza.reduce((acc, curr) => acc + curr, 0);
    const tiempoPromedio =
      tiemposLimpieza.length > 0 ? tiempoTotal / tiemposLimpieza.length : 0;

    // Calcular retrasos
    const habitacionesRetrasadas = habitacionesFiltradas.filter((h) => {
      if (!h.lastStatusChange || !h.tiempoLimpieza) return false;
      const tiempoEsperado = getTiempoEsperado(h.status, h.type || "standard");
      return h.tiempoLimpieza > tiempoEsperado;
    });

    // Obtener eficiencia global con valor por defecto para evitar errores
    const eficienciaGlobal = estadisticasGlobales?.eficienciaGlobal || 0;

    return {
      tiempoPromedio,
      eficienciaGlobal: eficienciaGlobal,
      totalLimpiezas: tiemposLimpieza.length,
      retrasos: habitacionesRetrasadas.length,
      ocupacionCamareras:
        ((camareras || []).filter((c) =>
          habitacionesFiltradas.some((h) => h.assignedTo === c.id)
        ).length /
          (camareras || []).length) *
          100 || 0,
    };
  };

  // Obtener tiempo esperado según tipo de limpieza y tipo de habitación
  const getTiempoEsperado = (
    tipoLimpieza: string,
    tipoHabitacion: string
  ): number => {
    // Base times by cleaning type
    const tiemposBase = {
      cleaning_checkout: 45,
      cleaning_occupied: 30,
      cleaning_touch: 15,
      default: 30,
    };

    // Multiplication factors by room type (adjust these values based on your needs)
    const factoresTipoHabitacion: Record<string, number> = {
      standard: 1.0,
      suite: 1.5,
      deluxe: 1.3,
      junior_suite: 1.4,
      presidential: 2.0,
      default: 1.0,
    };

    const tiempoBase =
      tiemposBase[tipoLimpieza as keyof typeof tiemposBase] ||
      tiemposBase.default;
    const factor =
      factoresTipoHabitacion[tipoHabitacion] || factoresTipoHabitacion.default;

    return tiempoBase * factor;
  };

  // Calcular eficiencia por camarera con consideración de tipos de habitación
  const getEficienciaPorCamarera = () => {
    return camareras
      .map((camarera) => {
        // Habitaciones asignadas a esta camarera
        const habitacionesCamarera = habitacionesFiltradas.filter(
          (h) => h.assignedTo === camarera.id
        );

        // Calcular eficiencia teniendo en cuenta el tipo de habitación
        let eficienciaTotal = 0;
        let tiempoPromedioTotal = 0;
        let habitacionesCalculadas = 0;

        habitacionesCamarera.forEach((hab) => {
          if (hab.tiempoLimpieza && hab.tiempoLimpieza > 0) {
            const tiempoEsperado = getTiempoEsperado(
              hab.status,
              hab.type || "standard"
            );
            const eficienciaHabitacion = Math.min(
              100,
              (tiempoEsperado / hab.tiempoLimpieza) * 100
            );

            eficienciaTotal += eficienciaHabitacion;
            tiempoPromedioTotal += hab.tiempoLimpieza;
            habitacionesCalculadas++;
          }
        });

        const eficiencia =
          habitacionesCalculadas > 0
            ? eficienciaTotal / habitacionesCalculadas
            : camarera.efficiency || 0;

        const tiempoPromedio =
          habitacionesCalculadas > 0
            ? tiempoPromedioTotal / habitacionesCalculadas
            : camarera.tiempoPromedio || 0;

        // Categorizar habitaciones por tipo
        const habitacionesPorTipo: Record<string, number> = {};
        habitacionesCamarera.forEach((hab) => {
          const tipo = hab.type || "sin_tipo";
          habitacionesPorTipo[tipo] = (habitacionesPorTipo[tipo] || 0) + 1;
        });

        return {
          id: camarera.id,
          nombre: camarera.name,
          eficiencia,
          tiempoPromedio,
          habitaciones: habitacionesCamarera.length,
          tiposHabitacion: habitacionesPorTipo,
          color: getColorPorEficiencia(eficiencia),
          completadas: habitacionesCamarera.filter(
            (h) => h.status === "available"
          ).length,
        };
      })
      .sort((a, b) => b.eficiencia - a.eficiencia);
  };

  // Obtener distribución de tipos de habitación por camarera
  const getDistribucionTiposPorCamarera = () => {
    const eficienciaPorCamarera = getEficienciaPorCamarera();
    const datos: any[] = [];

    tiposHabitacion.forEach((tipo) => {
      const datoTipo: any = {
        name: tipo,
      };

      eficienciaPorCamarera.forEach((camarera) => {
        datoTipo[camarera.nombre] = camarera.tiposHabitacion[tipo] || 0;
      });

      datos.push(datoTipo);
    });

    return datos;
  };

  // Función para determinar el color según la eficiencia
  const getColorPorEficiencia = (eficiencia: number): string => {
    if (eficiencia >= 90) return "#10b981";
    if (eficiencia >= 70) return "#f59e0b";
    return "#ef4444";
  };

  // Obtener estadísticas históricas por camarera
  const getEstadisticasHistoricas = () => {
    // Simulación de datos históricos - en una implementación real, estos se obtendrían de la base de datos
    const camareras = getEficienciaPorCamarera();
    const periodos =
      periodoSeleccionado === "semana"
        ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        : periodoSeleccionado === "mes"
        ? ["S1", "S2", "S3", "S4"]
        : ["Mañana", "Tarde"];

    return periodos.map((periodo) => {
      const dato: any = { name: periodo };

      camareras.slice(0, 5).forEach((camarera) => {
        // Simular variaciones aleatorias para la demostración
        const variacion = Math.random() * 20 - 10; // -10% a +10%
        dato[camarera.nombre] = Math.max(
          0,
          Math.min(100, camarera.eficiencia + variacion)
        );
      });

      return dato;
    });
  };

  const kpis = calcularKPIs();
  const eficienciaPorCamarera = getEficienciaPorCamarera();
  const distribucionTiposPorCamarera = getDistribucionTiposPorCamarera();
  const datosHistoricos = getEstadisticasHistoricas();

  // Colores para las camareras en gráficos
  const coloresCamareras = [
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
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select
            value={periodoSeleccionado}
            onValueChange={setPeriodoSeleccionado}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mes</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodoSeleccionado === "personalizado" && (
            <div className="flex items-center gap-2">
              <DatePicker date={fechaInicio} setDate={setFechaInicio} />
              <span>a</span>
              <DatePicker date={fechaFin} setDate={setFechaFin} />
            </div>
          )}
        </div>

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

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="text-xs text-muted-foreground">Por habitación</div>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrasos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.retrasos}</div>
            <div className="text-xs text-muted-foreground">
              habitaciones con tiempo excedido
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Rendimiento */}
      <div className="space-y-6">
        <Tabs
          defaultValue="eficiencia"
          value={vistaPorTipo}
          onValueChange={setVistaPorTipo}
        >
          <TabsList>
            <TabsTrigger value="eficiencia">Eficiencia</TabsTrigger>
            <TabsTrigger value="tiempo">Tiempos</TabsTrigger>
            <TabsTrigger value="distribucion">Tipos de Habitación</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
        </Tabs>

        <TabsContent value="eficiencia" className="mt-0">
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
                    <YAxis unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar name="Eficiencia %" dataKey="eficiencia">
                      {eficienciaPorCamarera.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <Bar
                      name="Completadas"
                      dataKey="completadas"
                      fill="#8884d8"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiempo" className="mt-0">
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
                    <Legend />
                    <Bar
                      name="Tiempo Promedio (min)"
                      dataKey="tiempoPromedio"
                      fill="#3b82f6"
                    />
                    <Bar
                      name="Habitaciones Asignadas"
                      dataKey="habitaciones"
                      fill="#10b981"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribucion" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Tipo de Habitación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distribucionTiposPorCamarera}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    {eficienciaPorCamarera
                      .slice(0, 5)
                      .map((camarera, index) => (
                        <Bar
                          key={camarera.id}
                          dataKey={camarera.nombre}
                          stackId="a"
                          fill={
                            coloresCamareras[index % coloresCamareras.length]
                          }
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Histórica de Eficiencia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosHistoricos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    {eficienciaPorCamarera
                      .slice(0, 5)
                      .map((camarera, index) => (
                        <Line
                          key={camarera.id}
                          type="monotone"
                          dataKey={camarera.nombre}
                          stroke={
                            coloresCamareras[index % coloresCamareras.length]
                          }
                          activeDot={{ r: 8 }}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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
                      {camarera.habitaciones} habitaciones (
                      {camarera.completadas} completadas)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {Math.round(camarera.tiempoPromedio)}min
                    </div>
                    <div className="text-sm text-gray-500">promedio</div>
                  </div>
                  <Badge
                    className={`px-2 py-1 ${
                      camarera.eficiencia >= 90
                        ? "bg-green-100 text-green-800"
                        : camarera.eficiencia >= 70
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
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
