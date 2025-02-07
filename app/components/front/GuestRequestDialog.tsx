"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from '@/app/hooks/use-toast';
import { MAINTENANCE_REQUEST_TYPES } from '@/app/lib/constants/room-states';

const REQUEST_TYPES = {
    housekeeping: [
        { value: 'cleaning', label: 'Limpieza' },
        { value: 'towels', label: 'Toallas' },
        { value: 'amenities', label: 'Amenities' },
        { value: 'bedding', label: 'Ropa de Cama' }
    ],
    maintenance: [
        { value: 'corrective', label: 'Mantenimiento Correctivo', description: 'Reparaciones sin bloquear habitación' },
        { value: 'preventive', label: 'Mantenimiento Preventivo', description: 'Mantenimiento programado' },
        { value: 'emergency', label: 'Emergencia', description: 'Requiere atención inmediata' },
        { value: 'blocked', label: 'Bloqueo por Mantenimiento', description: 'Bloquea la habitación' }
    ]
};

export function GuestRequestDialog({ hotelId, rooms, onRequestCreated }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [formData, setFormData] = useState({
        department: '',
        type: '',
        description: '',
        priority: 'medium',
        maintenanceType: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const selectedRoomData = rooms.find(room => room.id === selectedRoom);
        
        try {
            const baseRequest = {
                roomId: selectedRoom,
                roomNumber: selectedRoomData?.number,
                status: 'pending',
                createdAt: serverTimestamp(),
                source: 'reception',
                description: formData.description
            };

            if (formData.department === 'maintenance') {
                const maintenanceType = formData.type;
                const maintenanceConfig = MAINTENANCE_REQUEST_TYPES[maintenanceType];
                
                const maintenanceRequest = {
                    ...baseRequest,
                    type: 'maintenance',
                    maintenanceType,
                    priority: maintenanceConfig.priority,
                    requiresBlocking: maintenanceConfig.requiresBlocking
                };

                await addDoc(collection(db, 'hotels', hotelId, 'requests'), maintenanceRequest);

                // Si requiere bloqueo, actualizar estado de la habitación
                if (maintenanceConfig.requiresBlocking) {
                    const roomRef = doc(db, 'hotels', hotelId, 'rooms', selectedRoom);
                    await updateDoc(roomRef, {
                        status: 'blocked_maintenance',
                        lastStatusChange: serverTimestamp()
                    });
                } else if (selectedRoomData.status === 'occupied') {
                    // Si está ocupada, marcar como ocupada con mantenimiento pendiente
                    const roomRef = doc(db, 'hotels', hotelId, 'rooms', selectedRoom);
                    await updateDoc(roomRef, {
                        status: 'occupied_maintenance',
                        lastStatusChange: serverTimestamp()
                    });
                }
            } else {
                // Solicitudes normales de housekeeping
                const request = {
                    ...baseRequest,
                    ...formData,
                    priority: formData.priority
                };
                await addDoc(collection(db, 'hotels', hotelId, 'requests'), request);
            }

            toast({
                title: "Solicitud creada",
                description: "La solicitud ha sido registrada exitosamente."
            });

            setOpen(false);
            onRequestCreated?.();
            setFormData({
                department: '',
                type: '',
                description: '',
                priority: 'medium',
                maintenanceType: ''
            });
        } catch (error) {
            console.error('Error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear la solicitud."
            });
        } finally {
            setLoading(false);
        }
    };

    const currentTypes = formData.department ? REQUEST_TYPES[formData.department] : [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Crear Solicitud</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva Solicitud</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label>Habitación</label>
                        <Select value={selectedRoom} onValueChange={setSelectedRoom} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar habitación" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map(room => (
                                    <SelectItem key={room.id} value={room.id}>
                                        Habitación {room.number} - {room.status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <label>Departamento</label>
                        <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ 
                                ...formData, 
                                department: value, 
                                type: '' 
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.department && (
                        <div className="space-y-2">
                            <label>Tipo de Solicitud</label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currentTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex flex-col">
                                                <span>{type.label}</span>
                                                {type.description && (
                                                    <span className="text-xs text-gray-500">{type.description}</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {formData.department === 'housekeeping' && (
                        <div className="space-y-2">
                            <label>Prioridad</label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar prioridad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baja</SelectItem>
                                    <SelectItem value="medium">Media</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label>Descripción</label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalles de la solicitud..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Solicitud'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}