import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ImageIcon, Maximize2 } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  thumbnailSize?: 'small' | 'medium' | 'large';
}

const ImageGallery = ({ images, thumbnailSize = 'medium' }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  console.log('ImageGallery recibió imágenes:', images);

  // Validar el array de imágenes
  if (!images || !Array.isArray(images)) {
    console.error('Error: images debe ser un array', images);
    return (
      <div className="flex items-center justify-center h-20 bg-gray-100 rounded-lg">
        <ImageIcon className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 bg-gray-100 rounded-lg">
        <ImageIcon className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  const thumbnailSizeClasses = {
    small: 'h-16 w-16',
    medium: 'h-24 w-24',
    large: 'h-32 w-32'
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Error al cargar imagen:', e.currentTarget.src);
    setError('Error al cargar la imagen');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            className={`relative group cursor-pointer rounded-lg overflow-hidden ${
              thumbnailSizeClasses[thumbnailSize]
            } bg-gray-100`}
            onClick={() => {
              console.log('Click en imagen:', imageUrl);
              setSelectedImage(imageUrl);
              setCurrentIndex(index);
            }}
          >
            <img
              src={imageUrl}
              alt={`Imagen ${index + 1}`}
              className="h-full w-full object-cover"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
              <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex items-center justify-center p-0">
          <div className="relative w-full h-full flex items-center justify-center">
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev + 1) % images.length);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            <img
              src={images[currentIndex]}
              alt={`Imagen ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onError={handleImageError}
            />
            
            <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-500">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageGallery;