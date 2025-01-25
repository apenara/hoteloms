import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Clock, Home } from 'lucide-react';

const HousekeepingEfficiencyView = ({ staffMember, habitaciones }) => {
  const habitacionesHoy = habitaciones.filter(h => {
    const fecha = new Date(h.lastStatusChange.seconds * 1000);
    return fecha.toDateString() === new Date().toDateString();
  });

  const stats = {
    total: habitacionesHoy.length,
    completadas: habitacionesHoy.filter(h => h.status === 'available').length,
    enProgreso: habitacionesHoy.filter(h => h.status === 'cleaning').length,
    pendientes: habitacionesHoy.filter(h => h.status === 'need_cleaning' || h.status === 'checkout').length
  };

  const eficiencia = stats.total ? (stats.completadas / stats.total * 100) : 0;
  const tiempoPromedio = habitacionesHoy
    .filter(h => h.tiempoLimpieza)
    .reduce((acc, h) => acc + h.tiempoLimpieza, 0) / stats.completadas || 0;

  return (
    <div className="space-y-6">
      {/* Resumen Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold">Total</div>
            <div className="text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold text-green-600">Completadas</div>
            <div className="text-2xl">{stats.completadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold text-yellow-600">En Progreso</div>
            <div className="text-2xl">{stats.enProgreso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold text-blue-600">Pendientes</div>
            <div className="text-2xl">{stats.pendientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Eficiencia */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Eficiencia</div>
              <div className="text-2xl font-bold">
                <Badge className={
                  eficiencia > 80 ? 'bg-green-100 text-green-800' :
                  eficiencia > 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {eficiencia.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tiempo Promedio</div>
              <div className="text-2xl font-bold">
                {Math.round(tiempoPromedio)} min
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Habitaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Habitaciones Asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="cleaning">En Limpieza</TabsTrigger>
              <TabsTrigger value="completed">Completadas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <RoomList rooms={habitacionesHoy} />
            </TabsContent>
            <TabsContent value="cleaning">
              <RoomList rooms={habitacionesHoy.filter(h => h.status === 'cleaning')} />
            </TabsContent>
            <TabsContent value="completed">
              <RoomList rooms={habitacionesHoy.filter(h => h.status === 'available')} />
            </TabsContent>
            <TabsContent value="pending">
              <RoomList rooms={habitacionesHoy.filter(h => 
                h.status === 'need_cleaning' || h.status === 'checkout'
              )} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const RoomList = ({ rooms }) => (
  <ScrollArea className="h-[400px]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Habitación</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Hora Inicio</TableHead>
          <TableHead>Tiempo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.map(room => (
          <TableRow key={room.id}>
            <TableCell>{room.number}</TableCell>
            <TableCell>
              <RoomStatusBadge room={room} />
            </TableCell>
            <TableCell>
              {new Date(room.lastStatusChange.seconds * 1000).toLocaleTimeString()}
            </TableCell>
            <TableCell>
              {room.tiempoLimpieza ? `${room.tiempoLimpieza} min` : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

const RoomStatusBadge = ({ room }) => {
  const getStatusConfig = () => {
    switch (room.status) {
      case 'available':
        return {
          label: 'Completada',
          className: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'cleaning':
        return {
          label: 'En Limpieza',
          className: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="w-4 h-4" />
        };
      default:
        return {
          label: 'Pendiente',
          className: 'bg-blue-100 text-blue-800',
          icon: <Home className="w-4 h-4" />
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={config.className}>
      <div className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </div>
    </Badge>
  );
};

export default HousekeepingEfficiencyView;