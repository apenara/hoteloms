// src/components/housekeeping/DailyAssignmentCreator.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Save, UserPlus, Loader2 } from 'lucide-react';
import { Staff, Room } from '@/app/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface DailyAssignmentCreatorProps {
  camareras: Staff[];
  habitaciones: Room[];
  hotelId: string;
}

export function DailyAssignmentCreator({ camareras, habitaciones, hotelId }: DailyAssignmentCreatorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);

  // Función para cargar asignaciones existentes para la fecha seleccionada
  const loadExistingAssignments = async () => {
    if (!hotelId) return;
    
    try {
      setIsLoading(true);
      
      // Obtener inicio y fin del día seleccionado
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Consultar asignaciones para la fecha seleccionada
      const assignmentsRef = collection(db, 'hotels', hotelId, 'assignments');
      const q = query(
        assignmentsRef,
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      );
      
      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setExistingAssignments(assignments);
      
      // Marcar habitaciones ya asignadas
      const assignedRoomIds = new Set();
      assignments.forEach(assignment => {
        if (Array.isArray(assignment.rooms)) {
          assignment.rooms.forEach((room: any) => {
            assignedRoomIds.add(room.roomId);
          });
        }
      });
      
      // Actualizar selección de habitaciones (excluir las ya asignadas)
      setSelectedRooms(new Set());
      
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      setMessage({ text: 'Error al cargar asignaciones existentes', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar asignaciones existentes cuando cambia la fecha seleccionada
  useEffect(() => {
    loadExistingAssignments();
  }, [selectedDate, hotelId]);

  const toggleRoomSelection = (roomId: string) => {
    const newSelection = new Set(selectedRooms);
    if (newSelection.has(roomId)) {
      newSelection.delete(roomId);
    } else {
      newSelection.add(roomId);
    }
    setSelectedRooms(newSelection);
  };

  const handleSelectAllRooms = (floor?: number) => {
    const newSelection = new Set(selectedRooms);
    
    habitaciones.forEach(room => {
      // Si ya está asignada a alguien hoy, no seleccionarla
      const isAlreadyAssigned = existingAssignments.some(assignment => 
        assignment.rooms?.some((r: any) => r.roomId === room.id)
      );
      
      if (!isAlreadyAssigned && (floor === undefined || room.floor === floor)) {
        newSelection.add(room.id);
      }
    });
    
    setSelectedRooms(newSelection);
  };

  const handleUnselectAllRooms = () => {
    setSelectedRooms(new Set());
  };

  const handleCreateAssignment = async () => {
    if (!selectedStaff || selectedRooms.size === 0 || !hotelId) {
      setMessage({ text: 'Selecciona una camarera y al menos una habitación', type: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Crear documento de asignación
      const assignmentData = {
        staffId: selectedStaff,
        date: Timestamp.fromDate(selectedDate),
        rooms: Array.from(selectedRooms).map(roomId => {
          const room = habitaciones.find(h => h.id === roomId);
          return {
            roomId,
            roomNumber: room?.number || '',
            floor: room?.floor || 0,
            status: 'pending'
          };
        }),
        createdAt: Timestamp.now(),
        status: 'active'
      };

      // Guardar en Firestore
      const assignmentsRef = collection(db, 'hotels', hotelId, 'assignments');
      await addDoc(assignmentsRef, assignmentData);

      // Actualizar también el campo assignedTo en cada habitación
      for (const roomId of selectedRooms) {
        const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
        await updateDoc(roomRef, {
          assignedTo: selectedStaff,
          assignedAt: Timestamp.now()
        });
      }

      // Limpiar selección y mostrar mensaje de éxito
      setSelectedRooms(new Set());
      setSelectedStaff('');
      setMessage({ text: 'Asignación creada correctamente', type: 'success' });
      
      // Recargar asignaciones existentes
      await loadExistingAssignments();
      
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: 'Error al crear la asignación', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      
      // Llamar al servicio de asignación automática
      const result = await fetch(`/api/hotels/${hotelId}/housekeeping/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
        }),
      });
      
      const data = await result.json();
      
      if (data.success) {
        setMessage({ text: data.message || 'Asignación automática completada', type: 'success' });
        // Recargar asignaciones
        await loadExistingAssignments();
      } else {
        setMessage({ text: data.message || 'Error en la asignación automática', type: 'error' });
      }
    } catch (error) {
      console.error('Error en asignación automática:', error);
      setMessage({ text: 'Error al realizar la asignación automática', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Agrupar habitaciones por piso
  const roomsByFloor = habitaciones.reduce((acc, room) => {
    if (!acc[room.floor]) {
      acc[room.floor] = [];
    }
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  // Ordenar pisos
  const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Selector de fecha y camarera */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Asignación Diaria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensaje de estado */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col md:flex-row gap-4">
            {/* Selector de fecha */}
            <div className="space-y-2 flex-1">
              <Label>Fecha de Asignación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full flex justify-between items-center"
                  >
                    {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
                    <CalendarDays className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Selector de camarera */}
            <div className="space-y-2 flex-1">
              <Label>Camarera</Label>
              <select
                className="w-full h-10 px-3 py-2 border rounded-md"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="">Seleccionar camarera</option>
                {camareras.map((camarera) => (
                  <option key={camarera.id} value={camarera.id}>
                    {camarera.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botones de acción */}
            <div className="flex items-end space-x-2">
              <Button
                onClick={handleCreateAssignment}
                disabled={isLoading || !selectedStaff || selectedRooms.size === 0}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar Asignación
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleAutoAssign}
                disabled={isLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Asignación Automática
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector de habitaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Habitaciones Disponibles</span>
            <div className="space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleSelectAllRooms()}>
                Seleccionar Todas
              </Button>
              <Button size="sm" variant="outline" onClick={handleUnselectAllRooms}>
                Deseleccionar Todas
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {floors.map((floor) => (
              <div key={floor} className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Piso {floor}</h3>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleSelectAllRooms(floor)}
                  >
                    Seleccionar piso
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {roomsByFloor[floor].map((room) => {
                    // Verificar si la habitación ya está asignada
                    const isAssigned = existingAssignments.some(assignment => 
                      assignment.rooms?.some((r: any) => r.roomId === room.id)
                    );
                    
                    const assignedTo = isAssigned ? camareras.find(c => {
                      const assignment = existingAssignments.find(a => 
                        a.rooms?.some((r: any) => r.roomId === room.id)
                      );
                      return assignment && c.id === assignment.staffId;
                    })?.name : null;
                    
                    return (
                      <div 
                        key={room.id} 
                        className={`
                          border rounded-md p-2 
                          ${isAssigned ? 'bg-gray-100 opacity-60' : ''}
                          ${selectedRooms.has(room.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        `}
                      >
                        <div className="flex items-center space-x-2">
                          {!isAssigned && (
                            <Checkbox
                              id={`room-${room.id}`}
                              checked={selectedRooms.has(room.id)}
                              onCheckedChange={() => toggleRoomSelection(room.id)}
                            />
                          )}
                          <label 
                            htmlFor={`room-${room.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {room.number}
                          </label>
                        </div>
                        {isAssigned && (
                          <p className="text-xs text-gray-500 mt-1">
                            Asignada a: {assignedTo || 'Otra camarera'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Asignaciones existentes para la fecha */}
      {existingAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asignaciones Existentes - {format(selectedDate, "d 'de' MMMM", { locale: es })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camarera</TableHead>
                  <TableHead>Habitaciones</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingAssignments.map(assignment => {
                  const camarera = camareras.find(c => c.id === assignment.staffId);
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{camarera?.name || 'Desconocido'}</TableCell>
                      <TableCell>
                        {assignment.rooms?.length || 0} habitaciones
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignment.rooms?.slice(0, 10).map((room: any) => (
                            <span key={room.roomId} className="text-xs bg-gray-100 px-1 rounded">
                              {room.roomNumber}
                            </span>
                          ))}
                          {(assignment.rooms?.length || 0) > 10 && (
                            <span className="text-xs bg-gray-100 px-1 rounded">
                              +{(assignment.rooms?.length || 0) - 10} más
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{assignment.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}