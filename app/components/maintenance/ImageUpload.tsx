import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  onImagesSelected: (files: File[]) => void;
  maxImages?: number;
}

const ImageUpload = ({ onImagesSelected, maxImages = 3 }: ImageUploadProps) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validar número máximo de imágenes
    if (selectedImages.length + files.length > maxImages) {
      alert(`Solo puedes subir un máximo de ${maxImages} imágenes`);
      return;
    }

    // Validar tamaño y tipo de archivo
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB máximo
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      alert('Algunos archivos no son válidos. Solo se permiten imágenes JPG, PNG o WebP de hasta 5MB');
    }

    // Generar previsualizaciones
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    onImagesSelected(validFiles);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]); // Liberar memoria
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('image-upload')?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Agregar Imágenes
        </Button>
        <span className="text-sm text-gray-500">
          {selectedImages.length}/{maxImages} imágenes
        </span>
      </div>

      <input
        id="image-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleImageChange}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <div key={preview} className="relative">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;