import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUpload from './ImageUpload';
import { useAuth } from '@/lib/auth';

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    priority: string;
    images: File[];
  }) => Promise<void>;
  hotelId: string;
  loading?: boolean;
}

const MaintenanceDialog = ({
  isOpen,
  onClose,
  onSubmit,
  hotelId,
  loading = false
}: MaintenanceDialogProps) => {
  const { user, staff } = useAuth();
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    try {
      setError('');
      setIsUploading(true);

      if (!description.trim()) {
        setError('La descripción es requerida');
        return;
      }

      if (!user && !staff) {
        throw new Error('No hay una sesión activa');
      }

      // Enviar datos incluyendo las imágenes seleccionadas
      await onSubmit({
        description: description.trim(),
        priority,
        images: selectedImages // Pasar las imágenes tal cual las recibimos del ImageUpload
      });

      // Limpiar formulario
      setDescription('');
      setPriority('medium');
      setSelectedImages([]);
      onClose();
    } catch (error) {
      console.error('Error en la solicitud:', error);
      setError('Error al crear la solicitud: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsUploading(false);
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
              disabled={loading || isUploading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select value={priority} onValueChange={setPriority}>
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
              disabled={loading || isUploading}
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
            disabled={loading || isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || isUploading || !description.trim()}
          >
            {isUploading ? 'Subiendo...' : loading ? 'Creando...' : 'Crear Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceDialog;