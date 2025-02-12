import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { uploadMaintenanceImages } from '@/app/services/storage';

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    priority: string;
    imageUrls?: string[];
  }) => Promise<void>;
  hotelId: string;
  roomId: string;
  loading?: boolean;
}

const MaintenanceDialog = ({
  isOpen,
  onClose,
  onSubmit,
  hotelId,
  roomId,
  loading = false
}: MaintenanceDialogProps) => {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    try {
      setError('');
      if (!description.trim()) {
        setError('La descripción es requerida');
        return;
      }

      setIsUploading(true);

      // Si hay imágenes seleccionadas, subirlas primero
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        try {
          // Generar un ID único para el mantenimiento
          const maintenanceId = `maintenance_${Date.now()}`;
          imageUrls = await uploadMaintenanceImages(hotelId, maintenanceId, selectedImages);
        } catch (error) {
          console.error('Error subiendo imágenes:', error);
          setError('Error al subir las imágenes. Por favor, intente nuevamente.');
          return;
        }
      }

      // Enviar la solicitud con las URLs de las imágenes
      await onSubmit({
        description: description.trim(),
        priority,
        imageUrls
      });

      // Limpiar el formulario
      setDescription('');
      setPriority('medium');
      setSelectedImages([]);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al crear la solicitud');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setPriority('medium');
    setSelectedImages([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
            <Select 
              value={priority} 
              onValueChange={setPriority}
              disabled={loading || isUploading}
            >
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
              maxSize={5}
              quality={0.8}
              maxWidth={1920}
              maxHeight={1080}
            />
            <p className="text-xs text-gray-500">
              Puedes subir hasta 3 imágenes o tomarlas con la cámara
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading || isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || isUploading || !description.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : loading ? (
              'Creando...'
            ) : (
              'Crear Solicitud'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceDialog;