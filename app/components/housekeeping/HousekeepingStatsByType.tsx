"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  startOfDay,
  endOfDay,
  doc,
  getDoc,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

interface StatsByTypeProps {
  period: "daily" | "weekly" | "monthly";
}

interface StatRecord {
  staffId: string;
  staffName?: string;
  tiempoLimpieza: number;
  tipoLimpieza: string;
  tipoHabitacion: string;
  timestamp: Timestamp;
  fecha: string;
}

interface StatsByType {
  [key: string]: {
    cantidad: number;
    tiempoTotal: number;
    tiempoPromedio: number;
  };
}

interface StaffMetricsData {
  id: string;
  name: string;
  metricas: {
    totalHabitaciones: number;
    tiempoTotal: number;
    tiempoPromedio: number;
    porTipoLimpieza: StatsByType;
    porTipoHabitacion: StatsByType;
  };
}

const TIPO_LIMPIEZA_LABELS: Record<string, string> = {
  "cleaning_occupied": "Limpieza en Ocupación",
  "cleaning_checkout": "Limpieza de Salida",
  "cleaning_touch": "Limpieza Rápida"
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function HousekeepingStatsByType({ period }: StatsByTypeProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffStats, setStaffStats] = useState<StaffMetricsData[]>([]);
  const [globalRoomTypeStats, setGlobalRoomTypeStats] = useState<any[]>([]);
  const [globalCleaningTypeStats, setGlobalCleaningTypeStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("room-type");
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  });
  const [selectedStaff, setSelectedStaff] = useState<string>("all");

  useEffect(() => {
    if (!user?.hotelId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Determinar el rango de fechas según el período seleccionado
        const today = new Date();
        let startDate = new Date(today);
        let endDate = new Date(today);

        switch (period) {
          case "daily":
            startDate = new Date(today.setHours(0, 0, 0, 0));
            endDate = new Date(today.setHours(23, 59, 59, 999));
            break;
          case "weekly":
            const dayOfWeek = today.getDay() || 7; // Convertir 0 (domingo) a 7
            startDate = new Date(today.setDate(today.getDate() - dayOfWeek + 1));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
          case "monthly":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        }

        setDateRange({ start: startDate, end: endDate });

        // Obtener estadísticas de housekeeping
        await fetchHousekeepingStats(startDate, endDate);
        
        // Obtener datos de staff para tener nombres
        await fetchStaffMetrics();

      } catch (error: any) {
        console.error("Error al cargar estadísticas:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.hotelId, period]);

  const fetchHousekeepingStats = async (startDate: Date, endDate: Date) => {
    if (!user?.hotelId) return;

    // Convertir fechas a timestamp para Firestore
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Consultar registros de estadísticas
    const statsRef = collection(db, "hotels", user.hotelId, "housekeeping_stats");
    const statsQuery = query(
      statsRef,
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<=", endTimestamp),
      orderBy("timestamp", "desc")
    );

    const statsSnapshot = await getDocs(statsQuery);
    const statsData = statsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StatRecord[];

    // Procesar estadísticas por tipo de habitación
    const roomTypeStats: Record<string, { cantidad: number, tiempoTotal: number }> = {};
    const cleaningTypeStats: Record<string, { cantidad: number, tiempoTotal: number }> = {};

    statsData.forEach(record => {
      // Procesar por tipo de habitación
      if (!roomTypeStats[record.tipoHabitacion]) {
        roomTypeStats[record.tipoHabitacion] = { cantidad: 0, tiempoTotal: 0 };
      }
      roomTypeStats[record.tipoHabitacion].cantidad += 1;
      roomTypeStats[record.tipoHabitacion].tiempoTotal += record.tiempoLimpieza;

      // Procesar por tipo de limpieza
      if (!cleaningTypeStats[record.tipoLimpieza]) {
        cleaningTypeStats[record.tipoLimpieza] = { cantidad: 0, tiempoTotal: 0 };
      }
      cleaningTypeStats[record.tipoLimpieza].cantidad += 1;
      cleaningTypeStats[record.tipoLimpieza].tiempoTotal += record.tiempoLimpieza;
    });

    // Convertir a formato para gráficos
    const roomTypeData = Object.entries(roomTypeStats).map(([tipo, stats]) => ({
      name: tipo,
      cantidad: stats.cantidad,
      tiempoPromedio: Math.round(stats.tiempoTotal / stats.cantidad),
      tiempoTotal: stats.tiempoTotal
    }));

    const cleaningTypeData = Object.entries(cleaningTypeStats).map(([tipo, stats]) => ({
      name: tipo,
      label: TIPO_LIMPIEZA_LABELS[tipo] || tipo,
      cantidad: stats.cantidad,
      tiempoPromedio: Math.round(stats.tiempoTotal / stats.cantidad),
      tiempoTotal: stats.tiempoTotal
    }));

    setGlobalRoomTypeStats(roomTypeData);
    setGlobalCleaningTypeStats(cleaningTypeData);
  };

  const fetchStaffMetrics = async () => {
    if (!user?.hotelId) return;

    const staffRef = collection(db, "hotels", user.hotelId, "staff");
    const staffQuery = query(
      staffRef,
      where("role", "==", "housekeeper"),
      where("status", "==", "active")
    );

    const staffSnapshot = await getDocs(staffQuery);
    const staffWithMetrics = await Promise.all(staffSnapshot.docs.map(async (staffDoc) => {
      const staffData = staffDoc.data();
      
      // Verificar si tiene métricas
      if (staffData.metricas) {
        return {
          id: staffDoc.id,
          name: staffData.name,
          metricas: staffData.metricas
        };
      }
      
      return null;
    }));

    // Filtrar personal sin métricas
    const validStaff = staffWithMetrics.filter(staff => staff !== null) as StaffMetricsData[];
    setStaffStats(validStaff);
  };

  const renderRoomTypeStats = () => {
    const data = selectedStaff === "all" 
      ? globalRoomTypeStats 
      : staffStats.find(s => s.id === selectedStaff)?.metricas?.porTipoHabitacion 
        ? Object.entries(staffStats.find(s => s.id === selectedStaff)!.metricas.porTipoHabitacion).map(([tipo, stats]) => ({
            name: tipo,
            cantidad: stats.cantidad,
            tiempoPromedio: stats.tiempoPromedio,
            tiempoTotal: stats.tiempoTotal
          }))
        : [];

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No hay datos suficientes para mostrar estadísticas
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gráfico de barras para tiempo promedio por tipo de habitación */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md">Tiempo Promedio por Tipo de Habitación</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value} min`, 'Tiempo Promedio']} />
                  <Legend />
                  <Bar dataKey="tiempoPromedio" name="Tiempo Promedio (min)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico circular para cantidad por tipo de habitación */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md">Distribución por Tipo de Habitación</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de estadísticas por tipo de habitación */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Detalle por Tipo de Habitación</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Habitación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Tiempo Total (min)</TableHead>
                  <TableHead className="text-right">Tiempo Promedio (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.cantidad}</TableCell>
                    <TableCell className="text-right">{item.tiempoTotal}</TableCell>
                    <TableCell className="text-right">{item.tiempoPromedio}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCleaningTypeStats = () => {
    const data = selectedStaff === "all" 
      ? globalCleaningTypeStats 
      : staffStats.find(s => s.id === selectedStaff)?.metricas?.porTipoLimpieza
        ? Object.entries(staffStats.find(s => s.id === selectedStaff)!.metricas.porTipoLimpieza).map(([tipo, stats]) => ({
            name: tipo,
            label: TIPO_LIMPIEZA_LABELS[tipo] || tipo,
            cantidad: stats.cantidad,
            tiempoPromedio: stats.tiempoPromedio,
            tiempoTotal: stats.tiempoTotal
          }))
        : [];

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No hay datos suficientes para mostrar estadísticas
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gráfico de barras para tiempo promedio por tipo de limpieza */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md">Tiempo Promedio por Tipo de Limpieza</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value} min`, 'Tiempo Promedio']} />
                  <Legend />
                  <Bar dataKey="tiempoPromedio" name="Tiempo Promedio (min)" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico circular para cantidad por tipo de limpieza */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md">Distribución por Tipo de Limpieza</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#00C49F"
                    dataKey="cantidad"
                    nameKey="label"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value}`, props.payload.label]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de estadísticas por tipo de limpieza */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Detalle por Tipo de Limpieza</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Limpieza</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Tiempo Total (min)</TableHead>
                  <TableHead className="text-right">Tiempo Promedio (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-right">{item.cantidad}</TableCell>
                    <TableCell className="text-right">{item.tiempoTotal}</TableCell>
                    <TableCell className="text-right">{item.tiempoPromedio}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p className="font-medium">Error al cargar estadísticas</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Estadísticas de Limpieza por Tipo ({period === "daily" ? "Hoy" : period === "weekly" ? "Esta Semana" : "Este Mes"})
          </h2>
          <p className="text-sm text-gray-500">
            {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
          </p>
        </div>
        
        <div className="w-full md:w-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="staff-selector" className="text-sm">Personal</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger id="staff-selector">
                  <SelectValue placeholder="Seleccionar personal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {staffStats.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="room-type">Por Tipo de Habitación</TabsTrigger>
          <TabsTrigger value="cleaning-type">Por Tipo de Limpieza</TabsTrigger>
        </TabsList>
        
        <TabsContent value="room-type" className="pt-4">
          {renderRoomTypeStats()}
        </TabsContent>
        
        <TabsContent value="cleaning-type" className="pt-4">
          {renderCleaningTypeStats()}
        </TabsContent>
      </Tabs>
    </div>
  );
}