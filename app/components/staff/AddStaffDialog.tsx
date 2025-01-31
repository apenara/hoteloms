// src/components/staff/AddStaffDialog.tsx
'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { createStaffMember } from '@/lib/firebase/user-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StaffRole } from '@/lib/types';

interface AddStaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStaffDialog({ isOpen, onClose, onSuccess }: AddStaffDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPin, setGeneratedPin] = useState<string | null>(null); // Estado para el PIN asignado
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    pin: '', // Nuevo campo para el PIN
    assignedAreas: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedPin(null);
  
    try {
      // Validar que se proporcione un correo o un PIN
      if (!formData.email && !formData.pin) {
        throw new Error('Debe proporcionar un correo electrónico o un PIN');
      }
  
      // Validar el PIN si se proporciona
      if (formData.pin && formData.pin.length !== 10) {
        throw new Error('El PIN debe tener exactamente 10 caracteres');
      }
  
      const result = await createStaffMember({
        ...formData,
        hotelId: user.hotelId,
        role: formData.role as StaffRole,
        pin: formData.pin || undefined, // Pasar el PIN si existe
      });
  
      if (result.pin) {
        setGeneratedPin(result.pin); // Mostrar el PIN asignado
      }
  
      onSuccess();
      setFormData({
        name: '',
        email: '',
        role: '',
        pin: '',
        assignedAreas: [],
      });
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Error al crear el personal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Personal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {generatedPin && (
            <Alert>
              <AlertDescription>
                Personal creado exitosamente. PIN asignado: <strong>{generatedPin}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre completo"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email (opcional)</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rol</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="">Seleccionar rol</option>
              <option value="housekeeper">Limpieza</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="manager">Supervisor</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN (10 caracteres)</label>
            <Input
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              placeholder="Asignar un PIN de 10 caracteres"
              maxLength={10}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}