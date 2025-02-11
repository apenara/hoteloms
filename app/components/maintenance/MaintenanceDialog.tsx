// // components/maintenance/MaintenanceDialog.tsx
// import { useState } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { AlertTriangle } from 'lucide-react';

// interface MaintenanceDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSubmit: (notes: string) => Promise<void>;
// }

// export function MaintenanceDialog({ open, onOpenChange, onSubmit }: MaintenanceDialogProps) {
//   const [notes, setNotes] = useState('');
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleSubmit = async () => {
//     setIsSubmitting(true);
//     try {
//       await onSubmit(notes);
//       setNotes('');
//       onOpenChange(false);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2">
//             <AlertTriangle className="h-5 w-5 text-yellow-500" />
//             Solicitar Mantenimiento
//           </DialogTitle>
//           <DialogDescription>
//             Describe el problema que requiere atención de mantenimiento
//           </DialogDescription>
//         </DialogHeader>
//         <div className="py-4">
//           <Textarea
//             value={notes}
//             onChange={(e) => setNotes(e.target.value)}
//             placeholder="Describe el problema detalladamente..."
//             className="min-h-[150px]"
//           />
//         </div>
//         <DialogFooter className="flex gap-2">
//           <Button 
//             variant="outline" 
//             onClick={() => onOpenChange(false)}
//             disabled={isSubmitting}
//           >
//             Cancelar
//           </Button>
//           <Button 
//             onClick={handleSubmit}
//             disabled={isSubmitting || !notes.trim()}
//           >
//             {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

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

  const handleSubmit = async () => {
    try {
      setError('');
      if (!description.trim()) {
        setError('La descripción es requerida');
        return;
      }

      await onSubmit({
        description: description.trim(),
        priority,
        images: selectedImages
      });

      // Limpiar el formulario
      setDescription('');
      setPriority('medium');
      setSelectedImages([]);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al crear la solicitud');
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
              disabled={loading}
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
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
          >
            {loading ? 'Creando...' : 'Crear Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceDialog;