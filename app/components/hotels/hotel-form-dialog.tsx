// src/components/hotels/hotel-form-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';

export default function HotelFormDialog({
  isOpen,
  onClose,
  hotelToEdit = null,
  onSuccess
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    hotelName: hotelToEdit?.hotelName || '',
    ownerName: hotelToEdit?.ownerName || '',
    email: hotelToEdit?.email || '',
    phone: hotelToEdit?.phone || '',
    address: hotelToEdit?.address || '',
    roomCount: hotelToEdit?.roomCount || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (hotelToEdit) {
        // Actualizar hotel existente
        await updateDoc(doc(db, 'hotels', hotelToEdit.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Crear nuevo hotel
        const hotelRef = doc(collection(db, 'hotels', hotelData.id));
        await setDoc(hotelRef, {
          ...formData,
          status: 'trial',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
        });
        const userRef = doc(db, 'users', hotelData.id);
        await setDoc(userRef, {
          email: hotelData.email,
          name: hotelData.ownerName,
          role: 'hotel_admin',
          hotelId: hotelData.id,
          createdAt: serverTimestamp(),
          status: 'active'
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al guardar el hotel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {hotelToEdit ? 'Editar Hotel' : 'Crear Nuevo Hotel'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="hotelName">Nombre del Hotel</Label>
            <Input
              id="hotelName"
              value={formData.hotelName}
              onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Nombre del Propietario</Label>
            <Input
              id="ownerName"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roomCount">Número de Habitaciones</Label>
            <Input
              id="roomCount"
              type="number"
              value={formData.roomCount}
              onChange={(e) => setFormData({ ...formData, roomCount: e.target.value })}
              required
              min="1"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : hotelToEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}