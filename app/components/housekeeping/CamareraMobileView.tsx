// src/components/housekeeping/CamareraMobileView.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, Calendar, Timer, ClipboardList } from 'lucide-react';
import { Staff, Room } from '@/lib/types';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CamareraMobileViewProps {
  camarera: Staff;
  habitaciones: Room[];
  hotelId: string;
}

export function CamareraMobileView({ camarera, habitaciones, hotelId }: CamareraMobileViewProps) {
  const [activeTab, setActiveTab] = useState('stats');
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calcular estadísticas de la camarera
  const habitacionesAsignadas = habitaciones.filter(h => h.assignedTo === camarera.id);
  const habitacionesCompletadas = habitaciones.filter(
    h => h.assignedTo === camarera.id && h.status === 'available'
  );
  const habitacionActual = habitaciones.find(
    h => h.assignedTo === camarera.id && 
    ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'].includes(h.status)
  );

  // Cálculos de tiempos
  const [tiemposLimpiezaPorTipo, setTiemposLimpiezaPorTipo] = useState<Record<string, number[]>>({
    checkout: [],
    occupied: [],
    touch: []
  });

  // Función para obtener el historial de limpiezas de la camarera
  useEffect(() => {
    const fetchHistorial = async () => {
      if (!hotelId || !camarera.id) return;

      try {
        setLoading(true);
        
        // Consulta para obtener registros de limpieza de esta camarera
        const cleaningRecordsRef = collection(db, 'hotels', hotelId, 'cleaning_records');
        const q = query(
          cleaningRecordsRef,
          where('staffId', '==', camarera.id),
          where('status', '==', 'completed'),
          orderBy('endTime', 'desc'),
          limit(50) // Limitar a las 50 más recientes
        );
        
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Crear un nuevo objeto para evitar mutaciones
        const nuevosTiempos: Record<string, number[]> = {
          checkout: [],
          occupied: [],
          touch: []
        };
        
        // Agrupar los tiempos por tipo
        records.forEach(record => {
          const tipoLimpieza = record.tipoLimpieza || 'occupied';
          const tiempoTotal = record.tiempoTotal || 0;
          
          // Verificar también si es una limpieza de checkout
          if (tipoLimpieza.includes('checkout') || record.esLimpiezaCheckout) {
            nuevosTiempos.checkout.push(tiempoTotal);
          } else if (tipoLimpieza.includes('occupied')) {
            nuevosTiempos.occupied.push(tiempoTotal);
          } else if (tipoLimpieza.includes('touch')) {
            nuevosTiempos.touch.push(tiempoTotal);
          }
        });
        
        setTiemposLimpiezaPorTipo(nuevosTiempos);
        setHistorial(records);
        
        console.log("Registros cargados:", records.length);
        console.log("Tiempos por tipo:", nuevosTiempos);
      } catch (error) {
        console.error('Error al cargar historial:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [hotelId, camarera.id]);

  // Cálculo de tiempos promedio
  const calcularPromedio = (tiempos: number[]) => {
    if (tiempos.length === 0) return 0;
    return tiempos.reduce((sum, time) => sum + time, 0) / tiempos.length;
  };

  const tiempoPromedioCheckout = calcularPromedio(tiemposLimpiezaPorTipo.checkout);
  const tiempoPromedioOccupied = calcularPromedio(tiemposLimpiezaPorTipo.occupied);
  const tiempoPromedioTouch = calcularPromedio(tiemposLimpiezaPorTipo.touch);

  // Cálculo de progreso para la habitación actual
  const calcularProgreso = () => {
    if (!habitacionActual || !habitacionActual.lastStatusChange) return 0;
    
    const startTime = habitacionActual.lastStatusChange.toDate();
    const now = new Date();
    const tiempoTranscurrido = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    
    let tiempoEsperado = 30; // Valor predeterminado
    if (habitacionActual.status === 'cleaning_checkout') tiempoEsperado = 45;
    if (habitacionActual.status === 'cleaning_occupied') tiempoEsperado = 30;
    if (habitacionActual.status === 'cleaning_touch') tiempoEsperado = 15;
    
    return Math.min(100, (tiempoTranscurrido / tiempoEsperado) * 100);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{camarera.name}</CardTitle>
          <CardDescription>
            {camarera.email || 'Sin correo'} | 
            {camarera.phone && ` ${camarera.phone} |`} 
            Rol: {camarera.role}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-sm font-medium mb-1">Asignadas</div>
              <div className="text-2xl font-bold">{habitacionesAsignadas.length}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-sm font-medium mb-1">Completadas</div>
              <div className="text-2xl font-bold text-green-600">{habitacionesCompletadas.length}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-sm font-medium mb-1">Eficiencia</div>
              <div className="text-2xl font-bold text-blue-600">
                {habitacionesAsignadas.length ? 
                  `${Math.round((habitacionesCompletadas.length / habitacionesAsignadas.length) * 100)}%` : 
                  '0%'}
              </div>
            </div>
          </div>
          
          {/* Si hay una habitación en limpieza, mostrar su progreso */}
          {habitacionActual && (
            <div className="border rounded-lg p-4 mb-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-blue-500" />
                    Limpieza en Progreso - Hab. {habitacionActual.number}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {habitacionActual.status === 'cleaning_checkout' ? 'Checkout' :
                     habitacionActual.status === 'cleaning_occupied' ? 'Ocupada' :
                     habitacionActual.status === 'cleaning_touch' ? 'Retoque' : 'Limpieza'}
                  </p>
                </div>
                {habitacionActual.lastStatusChange && (
                  <Badge variant="outline">
                    {Math.floor((new Date().getTime() - habitacionActual.lastStatusChange.toDate().getTime()) / (1000 * 60))} min
                  </Badge>
                )}
              </div>
              <Progress value={calcularProgreso()} className="h-2" />
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stats">
              <div className="space-y-4 mt-4">
                <h3 className="font-medium">Tiempos Promedio por Tipo de Limpieza</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h4 className="font-medium">Check-out</h4>
                        <div className="text-3xl font-bold mt-2">{Math.round(tiempoPromedioCheckout)} min</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {tiemposLimpiezaPorTipo.checkout.length} limpiezas
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h4 className="font-medium">Habitación Ocupada</h4>
                        <div className="text-3xl font-bold mt-2">{Math.round(tiempoPromedioOccupied)} min</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {tiemposLimpiezaPorTipo.occupied.length} limpiezas
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h4 className="font-medium">Retoque</h4>
                        <div className="text-3xl font-bold mt-2">{Math.round(tiempoPromedioTouch)} min</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {tiemposLimpiezaPorTipo.touch.length} limpiezas
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Rendimiento General</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Timer className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="font-medium">Tiempo Promedio Global</span>
                        </div>
                        <span className="text-lg font-bold">
                          {Math.round(camarera.tiempoPromedio || 0)} min
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="font-medium">Habitaciones Completadas Total</span>
                        </div>
                        <span className="text-lg font-bold">
                          {camarera.habitacionesCompletadas || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ClipboardList className="h-5 w-5 text-purple-500 mr-2" />
                          <span className="font-medium">Eficiencia General</span>
                        </div>
                        <Badge className="text-lg">
                          {Math.round(camarera.efficiency || 0)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history">
              <div className="mt-4">
                <h3 className="font-medium mb-2">Historial de Limpiezas</h3>
                {loading ? (
                  <div className="text-center py-8">Cargando historial...</div>
                ) : historial.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No hay registros de limpieza</div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Habitación</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Duración</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historial.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {record.endTime ? 
                                format(record.endTime.toDate(), "d MMM yyyy, HH:mm", { locale: es }) : 
                                'No registrada'}
                            </TableCell>
                            <TableCell>
                              {record.roomNumber || 'No registrada'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.tipoLimpieza?.includes('checkout') ? 'Checkout' :
                                 record.tipoLimpieza?.includes('occupied') ? 'Ocupada' :
                                 record.tipoLimpieza?.includes('touch') ? 'Retoque' : 'Limpieza'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Timer className="h-4 w-4 mr-1 text-blue-500" />
                                {record.tiempoTotal || 0} min
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}