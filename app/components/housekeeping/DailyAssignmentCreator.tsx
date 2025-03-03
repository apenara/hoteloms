// src/components/housekeeping/DailyAssignmentCreator.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarDays,
  Save,
  UserPlus,
  Loader2,
  Trash2,
  Edit,
  Filter,
  BadgeInfo,
} from "lucide-react";
import { Staff, Room } from "@/app/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ROOM_STATES } from "@/app/lib/constants/room-states";
import { getDiasTranscurridos } from "@/app/lib/utils/housekeeping";

interface DailyAssignmentCreatorProps {
  camareras: Staff[];
  habitaciones: Room[];
  hotelId: string;
}

interface Assignment {
  id: string;
  staffId: string;
  staffName?: string;
  date: Timestamp;
  rooms: {
    roomId: string;
    roomNumber: string;
    floor: number;
    status: string;
  }[];
  status: "active" | "completed" | "cancelled";
  createdAt: Timestamp;
}

export function DailyAssignmentCreator({
  camareras,
  habitaciones,
  hotelId,
}: DailyAssignmentCreatorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>(
    []
  );
  const [showStateFilter, setShowStateFilter] = useState<boolean>(false);
  const [stateFilter, setStateFilter] = useState<string[]>([
    "checkout",
    "checkout_today",
    "clean_occupied",
    "need_cleaning",
    "dirty_occupied",
  ]);
  const [showStaffSelector, setShowStaffSelector] = useState<boolean>(false);
  const [selectedStaffMembers, setSelectedStaffMembers] = useState<Set<string>>(
    new Set()
  );
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(
    null
  );

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
      const assignmentsRef = collection(db, "hotels", hotelId, "assignments");
      const q = query(
        assignmentsRef,
        where("date", ">=", Timestamp.fromDate(startOfDay)),
        where("date", "<=", Timestamp.fromDate(endOfDay))
      );

      const snapshot = await getDocs(q);
      let assignments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Assignment[];

      // Añadir nombres de camareras a las asignaciones
      assignments = assignments.map((assignment) => {
        const camarera = camareras.find((c) => c.id === assignment.staffId);
        return {
          ...assignment,
          staffName: camarera?.name || "Desconocido",
        };
      });

      setExistingAssignments(assignments);

      // Marcar habitaciones ya asignadas
      const assignedRoomIds = new Set();
      assignments.forEach((assignment) => {
        if (Array.isArray(assignment.rooms)) {
          assignment.rooms.forEach((room) => {
            assignedRoomIds.add(room.roomId);
          });
        }
      });

      // Actualizar selección de habitaciones (excluir las ya asignadas)
      setSelectedRooms(new Set());
    } catch (error) {
      console.error("Error cargando asignaciones:", error);
      setMessage({
        text: "Error al cargar asignaciones existentes",
        type: "error",
      });
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

    habitaciones.forEach((room) => {
      // Si ya está asignada a alguien hoy, no seleccionarla
      const isAlreadyAssigned = existingAssignments.some((assignment) =>
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
      setMessage({
        text: "Selecciona una camarera y al menos una habitación",
        type: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Crear documento de asignación
      const assignmentData = {
        staffId: selectedStaff,
        date: Timestamp.fromDate(selectedDate),
        rooms: Array.from(selectedRooms).map((roomId) => {
          const room = habitaciones.find((h) => h.id === roomId);
          return {
            roomId,
            roomNumber: room?.number || "",
            floor: room?.floor || 0,
            status: "pending",
          };
        }),
        createdAt: Timestamp.now(),
        status: "active",
      };

      // Guardar en Firestore
      const assignmentsRef = collection(db, "hotels", hotelId, "assignments");
      await addDoc(assignmentsRef, assignmentData);

      // Actualizar también el campo assignedTo en cada habitación
      for (const roomId of selectedRooms) {
        const roomRef = doc(db, "hotels", hotelId, "rooms", roomId);
        await updateDoc(roomRef, {
          assignedTo: selectedStaff,
          assignedAt: Timestamp.now(),
        });
      }

      // Limpiar selección y mostrar mensaje de éxito
      setSelectedRooms(new Set());
      setSelectedStaff("");
      setMessage({ text: "Asignación creada correctamente", type: "success" });

      // Recargar asignaciones existentes
      await loadExistingAssignments();
    } catch (error) {
      console.error("Error:", error);
      setMessage({ text: "Error al crear la asignación", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      // Llamar al servicio de asignación automática
      const result = await fetch(
        `/api/hotels/${hotelId}/housekeeping/auto-assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate.toISOString(),
          }),
        }
      );

      const data = await result.json();

      if (data.success) {
        setMessage({
          text: `${data.message} Se asignaron ${data.assignmentsCreated} habitaciones`,
          type: "success",
        });
        // Recargar asignaciones
        await loadExistingAssignments();
      } else {
        setMessage({
          text: data.message || "Error en la asignación automática",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error en asignación automática:", error);
      setMessage({
        text: "Error al realizar la asignación automática",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar asignación automática con opciones
  // Borrar una asignación
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!hotelId || !assignmentId) return;

    try {
      setIsLoading(true);

      // Obtener la asignación para liberar las habitaciones
      const assignmentRef = doc(
        db,
        "hotels",
        hotelId,
        "assignments",
        assignmentId
      );
      const assignment = existingAssignments.find((a) => a.id === assignmentId);

      if (assignment) {
        // Liberar las habitaciones asignadas
        for (const room of assignment.rooms) {
          const roomRef = doc(db, "hotels", hotelId, "rooms", room.roomId);
          await updateDoc(roomRef, {
            assignedTo: null,
            assignedAt: null,
          });
        }

        // Borrar la asignación
        await deleteDoc(assignmentRef);

        setMessage({
          text: "Asignación eliminada correctamente",
          type: "success",
        });
        await loadExistingAssignments();
      }
    } catch (error) {
      console.error("Error al eliminar asignación:", error);
      setMessage({ text: "Error al eliminar la asignación", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Editar una asignación existente
  const handleEditAssignment = async (assignment: Assignment) => {
    setAssignmentToEdit(assignment);

    // Preseleccionar la camarera
    setSelectedStaff(assignment.staffId);

    // Preseleccionar las habitaciones
    const roomIds = new Set(assignment.rooms.map((room) => room.roomId));
    setSelectedRooms(roomIds);
  };

  // Guardar la edición de una asignación
  const saveAssignmentEdit = async () => {
    if (!hotelId || !assignmentToEdit || !selectedStaff) {
      setMessage({
        text: "Información incompleta para actualizar",
        type: "error",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Obtener la asignación original
      const assignmentRef = doc(
        db,
        "hotels",
        hotelId,
        "assignments",
        assignmentToEdit.id
      );

      // Liberar las habitaciones originales
      for (const room of assignmentToEdit.rooms) {
        const roomRef = doc(db, "hotels", hotelId, "rooms", room.roomId);
        await updateDoc(roomRef, {
          assignedTo: null,
          assignedAt: null,
        });
      }

      // Crear actualización con las nuevas habitaciones seleccionadas
      const updatedRooms = Array.from(selectedRooms).map((roomId) => {
        const room = habitaciones.find((h) => h.id === roomId);
        return {
          roomId,
          roomNumber: room?.number || "",
          floor: room?.floor || 0,
          status: "pending",
        };
      });

      // Actualizar la asignación
      await updateDoc(assignmentRef, {
        staffId: selectedStaff,
        rooms: updatedRooms,
        updatedAt: Timestamp.now(),
      });

      // Asignar las nuevas habitaciones
      for (const roomId of selectedRooms) {
        const roomRef = doc(db, "hotels", hotelId, "rooms", roomId);
        await updateDoc(roomRef, {
          assignedTo: selectedStaff,
          assignedAt: Timestamp.now(),
        });
      }

      setMessage({
        text: "Asignación actualizada correctamente",
        type: "success",
      });
      setAssignmentToEdit(null);
      setSelectedRooms(new Set());
      setSelectedStaff("");
      await loadExistingAssignments();
    } catch (error) {
      console.error("Error al actualizar asignación:", error);
      setMessage({ text: "Error al actualizar la asignación", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambio en selección de camareras múltiples
  const toggleStaffSelection = (staffId: string) => {
    const newSelection = new Set(selectedStaffMembers);
    if (newSelection.has(staffId)) {
      newSelection.delete(staffId);
    } else {
      newSelection.add(staffId);
    }
    setSelectedStaffMembers(newSelection);
  };

  const handleAutoAssignWithOptions = async (options: {
    staffIds?: string[];
    pisos?: number[];
    soloCheckout?: boolean;
    ignorarAsignadas?: boolean;
    tiposHabitacion?: string[];
  }) => {
    try {
      setIsLoading(true);
      setMessage(null);

      // Llamar al endpoint con opciones específicas
      const result = await fetch(
        `/api/hotels/${hotelId}/housekeeping/auto-assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate.toISOString(),
            options: options,
          }),
        }
      );

      const data = await result.json();

      if (data.success) {
        setMessage({
          text: `${data.message || "Asignación inteligente completada"} - ${
            data.assignmentsCreated
          } habitaciones asignadas`,
          type: "success",
        });
        // Recargar asignaciones
        await loadExistingAssignments();
        // Limpiar selecciones
        setSelectedRooms(new Set());
      } else {
        setMessage({
          text: data.message || "Error en la asignación inteligente",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error en asignación inteligente:", error);
      setMessage({
        text: "Error al realizar la asignación inteligente",
        type: "error",
      });
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
  const floors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => a - b);

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
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
            >
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
                disabled={
                  isLoading || !selectedStaff || selectedRooms.size === 0
                }
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar Asignación
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAutoAssign}
                  disabled={isLoading}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Asignación Automática
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMessage(null);

                    // Abre el modal de configuración de asignación automática
                    const selectedCamareras = selectedStaff
                      ? [selectedStaff]
                      : [];
                    const selectedPisos = new Set<number>();

                    habitaciones.forEach((room) => {
                      if (selectedRooms.has(room.id)) {
                        selectedPisos.add(room.floor);
                      }
                    });

                    // Usar las camareras seleccionadas en el selector múltiple
                    const staffIdsToUse =
                      selectedStaffMembers.size > 0
                        ? Array.from(selectedStaffMembers)
                        : selectedCamareras.length > 0
                        ? selectedCamareras
                        : undefined;

                    handleAutoAssignWithOptions({
                      staffIds: staffIdsToUse,
                      pisos:
                        selectedPisos.size > 0
                          ? Array.from(selectedPisos)
                          : undefined,
                      soloCheckout: false,
                      ignorarAsignadas: true,
                    });
                  }}
                  disabled={isLoading}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Asignación Inteligente
                </Button>
              </div>
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectAllRooms()}
              >
                Seleccionar Todas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnselectAllRooms}
              >
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
                    const isAssigned = existingAssignments.some((assignment) =>
                      assignment.rooms?.some((r) => r.roomId === room.id)
                    );

                    // Verificar si el estado está en los filtros seleccionados
                    const isStateFiltered = stateFilter.includes(room.status);

                    // Si hay filtro de estado y este estado no está incluido, no mostrar
                    if (stateFilter.length > 0 && !isStateFiltered) return null;

                    const assignedTo = isAssigned
                      ? camareras.find((c) => {
                          const assignment = existingAssignments.find((a) =>
                            a.rooms?.some((r) => r.roomId === room.id)
                          );
                          return assignment && c.id === assignment.staffId;
                        })?.name
                      : null;

                    const roomStateInfo = ROOM_STATES[room.status] || {
                      label: room.status,
                      color: "bg-gray-100 text-gray-800",
                    };

                    return (
                      <div
                        key={room.id}
                        className={`
                          border rounded-md p-2 
                          ${isAssigned ? "bg-gray-100 opacity-60" : ""}
                          ${
                            selectedRooms.has(room.id)
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            {!isAssigned && (
                              <Checkbox
                                id={`room-${room.id}`}
                                checked={selectedRooms.has(room.id)}
                                onCheckedChange={() =>
                                  toggleRoomSelection(room.id)
                                }
                              />
                            )}
                            <label
                              htmlFor={`room-${room.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {room.number}
                            </label>
                          </div>
                          <Badge
                            className={`text-xs px-1 py-0 ${roomStateInfo.color}`}
                            variant="outline"
                          >
                            {roomStateInfo.label}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs flex justify-between">
                          <span className="text-gray-500">
                            {room.type || "Estándar"}
                          </span>
                          {room.lastCleaned && (
                            <span className="text-gray-500">
                              {getDiasTranscurridos(room.lastCleaned)}d
                            </span>
                          )}
                        </div>
                        {isAssigned && (
                          <p className="text-xs text-gray-500 mt-1">
                            Asignada a: {assignedTo || "Otra camarera"}
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

      {/* Filtro de estados y selector de camareras */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Button
          variant="outline"
          onClick={() => setShowStateFilter(!showStateFilter)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtrar por estados
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowStaffSelector(!showStaffSelector)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {selectedStaffMembers.size
            ? `${selectedStaffMembers.size} camareras seleccionadas`
            : "Seleccionar camareras en turno"}
        </Button>
      </div>

      {/* Panel de filtros de estado */}
      {showStateFilter && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrar habitaciones por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROOM_STATES).map(([state, config]) => (
                <Badge
                  key={state}
                  variant={stateFilter.includes(state) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (stateFilter.includes(state)) {
                      setStateFilter(stateFilter.filter((s) => s !== state));
                    } else {
                      setStateFilter([...stateFilter, state]);
                    }
                  }}
                >
                  {config.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de camareras en turno */}
      {showStaffSelector && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar camareras en turno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {camareras.map((camarera) => (
                <div
                  key={camarera.id}
                  className={`border p-3 rounded-md flex items-center gap-2 cursor-pointer ${
                    selectedStaffMembers.has(camarera.id)
                      ? "bg-blue-50 border-blue-500"
                      : ""
                  }`}
                  onClick={() => toggleStaffSelection(camarera.id)}
                >
                  <Checkbox
                    checked={selectedStaffMembers.has(camarera.id)}
                    onCheckedChange={() => toggleStaffSelection(camarera.id)}
                  />
                  <span>{camarera.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedStaffMembers(new Set(camareras.map((c) => c.id)))
                }
              >
                Seleccionar todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => setSelectedStaffMembers(new Set())}
              >
                Limpiar selección
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogo para editar asignación */}
      {assignmentToEdit && (
        <Dialog
          open={!!assignmentToEdit}
          onOpenChange={(open) => !open && setAssignmentToEdit(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar asignación</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label>Habitaciones asignadas</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                  {habitaciones.map((room) => {
                    const isInOriginalAssignment = assignmentToEdit.rooms.some(
                      (r) => r.roomId === room.id
                    );
                    const isAssignedToOther = existingAssignments.some(
                      (a) =>
                        a.id !== assignmentToEdit.id &&
                        a.rooms.some((r) => r.roomId === room.id)
                    );

                    if (isAssignedToOther && !isInOriginalAssignment)
                      return null;

                    return (
                      <div
                        key={room.id}
                        className={`border rounded-md p-2 text-center ${
                          selectedRooms.has(room.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        } ${isAssignedToOther ? "opacity-50" : ""}`}
                      >
                        <div className="flex flex-col items-center">
                          <Checkbox
                            id={`room-edit-${room.id}`}
                            checked={selectedRooms.has(room.id)}
                            onCheckedChange={() => {
                              const newSelection = new Set(selectedRooms);
                              if (newSelection.has(room.id)) {
                                newSelection.delete(room.id);
                              } else {
                                newSelection.add(room.id);
                              }
                              setSelectedRooms(newSelection);
                            }}
                            disabled={
                              isAssignedToOther && !isInOriginalAssignment
                            }
                          />
                          <label
                            htmlFor={`room-edit-${room.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {room.number}
                          </label>
                          <span className="text-xs text-gray-500">
                            {ROOM_STATES[room.status]?.label || room.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignmentToEdit(null)}
              >
                Cancelar
              </Button>
              <Button onClick={saveAssignmentEdit} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Asignaciones existentes para la fecha */}
      {existingAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Asignaciones Existentes -{" "}
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camarera</TableHead>
                  <TableHead>Habitaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingAssignments.map((assignment) => {
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.staffName}
                      </TableCell>
                      <TableCell>
                        {assignment.rooms?.length || 0} habitaciones
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignment.rooms?.slice(0, 10).map((room) => (
                            <span
                              key={room.roomId}
                              className="text-xs px-1 rounded flex items-center gap-1"
                              style={{
                                backgroundColor:
                                  ROOM_STATES[
                                    habitaciones.find(
                                      (h) => h.id === room.roomId
                                    )?.status || "default"
                                  ]?.color || "bg-gray-100",
                              }}
                            >
                              {room.roomNumber}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="inline-flex items-center">
                                    <BadgeInfo className="h-3 w-3 text-gray-500" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">
                                      Habitación {room.roomNumber}
                                    </h4>
                                    <div className="text-sm">
                                      <p>
                                        <strong>Piso:</strong> {room.floor}
                                      </p>
                                      <p>
                                        <strong>Estado:</strong>{" "}
                                        {ROOM_STATES[
                                          habitaciones.find(
                                            (h) => h.id === room.roomId
                                          )?.status || "default"
                                        ]?.label ||
                                          habitaciones.find(
                                            (h) => h.id === room.roomId
                                          )?.status ||
                                          "Desconocido"}
                                      </p>
                                      <p>
                                        <strong>Tipo:</strong>{" "}
                                        {habitaciones.find(
                                          (h) => h.id === room.roomId
                                        )?.type || "Estándar"}
                                      </p>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </span>
                          ))}
                          {(assignment.rooms?.length || 0) > 10 && (
                            <span className="text-xs bg-gray-100 px-1 rounded">
                              +{(assignment.rooms?.length || 0) - 10} más
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>{assignment.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAssignment(assignment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteAssignment(assignment.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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
