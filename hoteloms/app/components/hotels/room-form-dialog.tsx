// src/components/hotels/room-form-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query } from 'firebase/firestore';

const ROOM_TYPES = [
  { value: 'single', label: 'Individual' },
  { value: 'double', label: 'Doble' },
  { value: 'suite', label: 'Suite' },
  { value: 'presidential', label: 'Presidencial' }
];

export default function RoomFormDialog({
  isOpen,
  onClose,
  hotelId,
  roomToEdit = null,
  onSuccess
}) {
  const [mode, setMode] = useState('single');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    roomPrefix: '',
    startNumber: '',
    endNumber: '',
    number: roomToEdit?.number || '',
    type: roomToEdit?.type || 'single',
    floor: roomToEdit?.floor || '',
    features: roomToEdit?.features?.join(', ') || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'batch') {
        await createBatchRooms();
      } else {
        await createSingleRoom();
      }
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al guardar la(s) habitación(es)');
    } finally {
      setIsLoading(false);
    }
  };

  const createSingleRoom = async () => {
    const roomData = {
      number: formData.number,
      type: formData.type,
      floor: parseInt(formData.floor),
      features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
      status: 'available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (roomToEdit) {
      await updateDoc(doc(db, 'hotels', hotelId, 'rooms', roomToEdit.id), roomData);
    } else {
      const roomRef = doc(collection(db, 'hotels', hotelId, 'rooms'));
      await setDoc(roomRef, roomData);
    }
  };

  const createBatchRooms = async () => {
    const start = parseInt(formData.startNumber);
    const end = parseInt(formData.endNumber);

    if (isNaN(start) || isNaN(end) || start > end) {
      throw new Error('Rango de números inválido');
    }

    // Verificar habitaciones existentes
    const existingRooms = await getDocs(query(collection(db, 'hotels', hotelId, 'rooms')));
    const existingNumbers = new Set(existingRooms.docs.map(doc => doc.data().number));

    for (let i = start; i <= end; i++) {
      const roomNumber = `${formData.roomPrefix}${i.toString().padStart(2, '0')}`;
      if (!existingNumbers.has(roomNumber)) {
        const roomRef = doc(collection(db, 'hotels', hotelId, 'rooms'));
        await setDoc(roomRef, {
          number: roomNumber,
          type: formData.type,
          floor: parseInt(formData.floor),
          features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {roomToEdit ? 'Editar Habitación' : 'Agregar Habitaciones'}
          </DialogTitle>
          {!roomToEdit && (
            <DialogDescription>
              Agrega una habitación individual o múltiples habitaciones
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="w-full">
          {!roomToEdit && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Individual</TabsTrigger>
              <TabsTrigger value="batch">Multiple</TabsTrigger>
            </TabsList>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="single">
              <div className="space-y-2">
                <Label htmlFor="number">Número de Habitación</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="Ej: 101, A101, Suite1"
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="batch">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomPrefix">Prefijo (opcional)</Label>
                  <Input
                    id="roomPrefix"
                    value={formData.roomPrefix}
                    onChange={(e) => setFormData({ ...formData, roomPrefix: e.target.value })}
                    placeholder="Ej: H, A, Suite"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startNumber">Número Inicial</Label>
                    <Input
                      id="startNumber"
                      type="number"
                      value={formData.startNumber}
                      onChange={(e) => setFormData({ ...formData, startNumber: e.target.value })}
                      required={mode === 'batch'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endNumber">Número Final</Label>
                    <Input
                      id="endNumber"
                      type="number"
                      value={formData.endNumber}
                      onChange={(e) => setFormData({ ...formData, endNumber: e.target.value })}
                      required={mode === 'batch'}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Piso</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  {ROOM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Características (separadas por comas)</Label>
              <Input
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="TV, WiFi, Minibar"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : roomToEdit ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}