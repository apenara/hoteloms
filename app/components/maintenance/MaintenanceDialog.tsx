// src/components/maintenance/MaintenanceDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUpload from './ImageUpload';

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    priority: string;
    images: File[];
  }) => Promise<void>;
  loading?: boolean;
}

const MaintenanceDialog = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}: MaintenanceDialogProps) => {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setError('');
      
      // Validaciones
      if (!description.trim()) {
        setError('La descripción es requerida');
        return;
      }

      // Evitar múltiples envíos
      if (submitting || loading) return;
      
      setSubmitting(true);
      console.log('Enviando solicitud de mantenimiento:', {
        description: description.trim(),
        priority,
        images: selectedImages.length
      });

      // Llamar a la función de envío
      await onSubmit({
        description: description.trim(),
        priority,
        images: selectedImages
      });

      // Limpiar el formulario
      setDescription('');
      setPriority('medium');
      setSelectedImages([]);
      
      // Cerrar diálogo
      onClose();
    } catch (error) {
      console.error('Error al crear la solicitud:', error);
      setError('Error al crear la solicitud: ' + (error.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Mantenimiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción del Problema</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema que requiere mantenimiento..."
              className="min-h-[100px]"
              disabled={loading || submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select value={priority} onValueChange={setPriority} disabled={loading || submitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Imágenes</label>
            <ImageUpload
              onImagesSelected={setSelectedImages}
              maxImages={3}
              disabled={loading || submitting}
            />
            <p className="text-xs text-gray-500">
              Puedes subir hasta 3 imágenes (JPG, PNG o WebP, máx. 5MB cada una)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting || !description.trim()}
          >
            {loading || submitting ? 'Creando...' : 'Crear Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceDialog;