import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2 } from 'lucide-react';

interface ImageViewerProps {
  urls: string[];
}

const ImageViewer = ({ urls }: ImageViewerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!urls?.length) return null;

  return (
    <div className="space-y-2">
      {/* Miniaturas */}
      <div className="grid grid-cols-3 gap-2">
        {urls.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => {
              setCurrentIndex(index);
              setIsOpen(true);
            }}
          >
            <img
              src={url}
              alt={`Imagen ${index + 1}`}
              className="h-full w-full object-cover"
              onError={(e) => {
                console.error('Error cargando imagen:', url);
                e.currentTarget.parentElement.innerHTML = `
                  <div class="flex items-center justify-center h-full">
                    <ImageIcon class="h-6 w-6 text-gray-400" />
                  </div>
                `;
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
              <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal de vista ampliada */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <div className="relative h-full flex items-center justify-center bg-black/50">
            <img
              src={urls[currentIndex]}
              alt={`Imagen ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
            
            {urls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev + 1) % urls.length);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
              {currentIndex + 1} / {urls.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageViewer;