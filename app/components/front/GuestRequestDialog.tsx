"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from '@/app/hooks/use-toast';

interface GuestRequestDialogProps {
    hotelId: string;
    rooms: any[]; // Asegúrate de que esta línea esté presente
    onRequestCreated?: () => void;
}

const REQUEST_TYPES = {
    housekeeping: [
        { value: 'cleaning', label: 'Limpieza' },
        { value: 'towels', label: 'Toallas' },
        { value: 'amenities', label: 'Amenities' },
        { value: 'bedding', label: 'Ropa de Cama' }
    ],
    maintenance: [
        { value: 'ac', label: 'Aire Acondicionado' },
        { value: 'tv', label: 'Televisión' },
        { value: 'light', label: 'Iluminación' },
        { value: 'bathroom', label: 'Baño' },
        { value: 'other', label: 'Otro' }
    ]
};

export function GuestRequestDialog({ hotelId, rooms, onRequestCreated }: GuestRequestDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [formData, setFormData] = useState({
        department: '',
        type: '',
        description: '',
        priority: 'medium'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
      
        const selectedRoomData = rooms.find(room => room.id === selectedRoom);
      
        try {
          const request = {
            ...formData,
            roomId: selectedRoom,
            roomNumber: selectedRoomData?.number,
            status: 'pending',
            createdAt: serverTimestamp(),
            source: 'reception'
          };
      
          await addDoc(collection(db, 'hotels', hotelId, 'requests'), request);

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
                priority: 'medium'
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear la solicitud."
            });
        } finally {
            setLoading(false);
        }
    };

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
                        <Select
                            value={selectedRoom}
                            onValueChange={setSelectedRoom}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar habitación" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map(room => (
                                    <SelectItem key={room.id} value={room.id}>
                                        Habitación {room.number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <label>Departamento</label>
                        <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ ...formData, department: value, type: '' })}
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
                                    {REQUEST_TYPES[formData.department].map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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