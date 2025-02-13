import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Compressor from 'compressorjs';

interface ImageUploadProps {
  onImagesSelected: (files: File[]) => void;
  maxImages?: number;
  maxSize?: number; // en MB
  quality?: number; // 0 a 1
  maxWidth?: number;
  maxHeight?: number;
}

const ImageUpload = ({ 
  onImagesSelected, 
  maxImages = 3,
  maxSize = 5,
  quality = 0.8,
  maxWidth = 1920,
  maxHeight = 1080
}: ImageUploadProps) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: quality,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        convertSize: maxSize * 1024 * 1024,
        success: (compressedFile) => {
          resolve(compressedFile as File);
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > maxImages) {
      alert(`Solo puedes subir un máximo de ${maxImages} imágenes`);
      return;
    }

    setProcessing(true);
    try {
      const processedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        try {
          const processedFile = await processImage(file);
          processedFiles.push(processedFile);
          newPreviews.push(URL.createObjectURL(processedFile));
        } catch (error) {
          console.error('Error procesando imagen:', error);
          continue;
        }
      }

      if (processedFiles.length > 0) {
        setSelectedImages(prev => [...prev, ...processedFiles]);
        setPreviews(prev => [...prev, ...newPreviews]);
        onImagesSelected(processedFiles);
      }
    } catch (error) {
      console.error('Error general procesando imágenes:', error);
      alert('Hubo un error procesando algunas imágenes. Por favor, intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
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
          disabled={processing}
        >
          <Upload className="h-4 w-4" />
          {processing ? 'Procesando...' : 'Agregar Imágenes'}
        </Button>

        <span className="text-sm text-gray-500">
          {selectedImages.length}/{maxImages} imágenes
        </span>
      </div>

      <input
        id="image-upload"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageChange}
        disabled={processing}
        capture="environment"
      />

      {processing && (
        <div className="text-sm text-blue-600">
          Procesando imágenes, por favor espere...
        </div>
      )}

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
                disabled={processing}
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