'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MaintenanceType, MaintenanceCategory, MaintenancePriority, Room, Staff } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from '../ui/badge';

interface MaintenanceFormDialogProps {
  hotelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAINTENANCE_TYPES = {
  preventive: 'Preventivo',
  corrective: 'Correctivo'
};

const CATEGORIES = {
  room: 'Habitación',
  common_area: 'Área Común',
  equipment: 'Equipamiento',
  facility: 'Instalaciones'
};

const PRIORITIES = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
};

const MaintenanceFormDialog = ({ 
  hotelId, 
  isOpen, 
  onClose,
  onSuccess 
}: MaintenanceFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    type: 'corrective' as MaintenanceType,
    category: 'room' as MaintenanceCategory,
    roomId: '',
    location: '',
    description: '',
    priority: 'medium' as MaintenancePriority,
    scheduledFor: new Date().toISOString().split('T')[0],
    assignedTo: ''
  });

  useEffect(() => {
    const fetchRoomsAndStaff = async () => {
      if (!hotelId) return;
      
      setLoadingData(true);
      try {
        // Obtener habitaciones
        const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
        const roomsSnap = await getDocs(roomsRef);
        const roomsData = roomsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Room[];
        setRooms(roomsData);

        // Obtener personal de mantenimiento
        const staffRef = collection(db, 'hotels', hotelId, 'staff');
        const staffQuery = query(staffRef, where('role', '==', 'maintenance'));
        const staffSnap = await getDocs(staffQuery);
        const staffData = staffSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Staff[];
        setMaintenanceStaff(staffData);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchRoomsAndStaff();
  }, [hotelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const maintenanceRef = collection(db, 'hotels', hotelId, 'maintenance');
      const selectedRoom = rooms.find(r => r.id === formData.roomId);
      const location = formData.category === 'room' 
        ? `Habitación ${selectedRoom?.number}` 
        : formData.location;

      await addDoc(maintenanceRef, {
        ...formData,
        location,
        status: 'pending',
        createdAt: Timestamp.now(),
        scheduledFor: Timestamp.fromDate(new Date(formData.scheduledFor))
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error al crear mantenimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: any) => {
    const value = e?.target?.value ?? e;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loadingData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Mantenimiento</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            Cargando datos...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Mantenimiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={handleChange('type')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MAINTENANCE_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    category: value as MaintenanceCategory,
                    roomId: '',
                    location: ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ubicación</Label>
            {formData.category === 'room' ? (
              <div className="space-y-2">
                <Select
                  value={formData.roomId}
                  onValueChange={handleChange('roomId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar habitación" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Habitación {room.number} - Piso {room.floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formData.roomId && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                    {(() => {
                      const selectedRoom = rooms.find(r => r.id === formData.roomId);
                      if (!selectedRoom) return null;

                      const getStatusColor = (status: string) => {
                        const colors = {
                          available: 'bg-green-100 text-green-800',
                          occupied: 'bg-blue-100 text-blue-800',
                          maintenance: 'bg-yellow-100 text-yellow-800',
                          cleaning: 'bg-purple-100 text-purple-800'
                        };
                        return colors[status] || 'bg-gray-100 text-gray-800';
                      };

                      const getStatusLabel = (status: string) => {
                        const labels = {
                          available: 'Disponible',
                          occupied: 'Ocupada',
                          maintenance: 'En Mantenimiento',
                          cleaning: 'Limpieza'
                        };
                        return labels[status] || status;
                      };

                      return (
                        <>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">Habitación {selectedRoom.number}</h4>
                              <p className="text-sm text-gray-500">Piso {selectedRoom.floor}</p>
                            </div>
                            <Badge className={getStatusColor(selectedRoom.status)}>
                              {getStatusLabel(selectedRoom.status)}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                              <span>Última limpieza:</span>
                              <span>{selectedRoom.lastCleaned ? 
                                new Date(selectedRoom.lastCleaned.seconds * 1000).toLocaleDateString('es-CO') : 
                                'No registrada'}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Último mantenimiento:</span>
                              <span>{selectedRoom.lastMaintenance ? 
                                new Date(selectedRoom.lastMaintenance.seconds * 1000).toLocaleDateString('es-CO') : 
                                'No registrado'}</span>
                            </div>
                            {selectedRoom.features?.length > 0 && (
                              <div className="mt-2">
                                <span className="text-gray-500">Características:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {selectedRoom.features.map((feature, index) => (
                                    <Badge key={index} variant="outline">
                                      {feature}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <Input
                placeholder="Especificar ubicación (ej: Lobby, Piscina)"
                value={formData.location}
                onChange={handleChange('location')}
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Asignar a</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={handleChange('assignedTo')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar personal de mantenimiento" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Describe el mantenimiento requerido"
              value={formData.description}
              onChange={handleChange('description')}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={handleChange('priority')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Programada</Label>
              <Input
                type="date"
                value={formData.scheduledFor}
                onChange={handleChange('scheduledFor')}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {formData.category === 'room' && !formData.roomId && (
            <Alert>
              <AlertDescription>
                Por favor selecciona una habitación
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (formData.category === 'room' && !formData.roomId)}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceFormDialog;