import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import ReactDOM from 'react-dom/client'; // Importa ReactDOM desde 'react-dom/client'

const QRDownloadManager = ({ rooms, hotelId, size = 256 }) => {
  const [downloading, setDownloading] = useState(false);

  const downloadSingleQR = (svg, roomNumber) => {
    return new Promise((resolve) => {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-Habitacion-${roomNumber}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        resolve();
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    });
  };

  const downloadMultipleQRs = async (selectedRooms) => {
    setDownloading(true);
    
    try {
      // Crear todos los SVGs primero
      const qrElements = await Promise.all(selectedRooms.map(async (roomId) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) {
          console.error(`Habitación con ID ${roomId} no encontrada.`);
          return null;
        }

        const qrContainer = document.createElement('div');
        document.body.appendChild(qrContainer); // Añadir el contenedor al DOM

        const root = ReactDOM.createRoot(qrContainer); // Usar createRoot en React 18+
        const qrComponent = (
          <QRCodeSVG
            value={`${window.location.origin}/rooms/${hotelId}/${room.id}`}
            size={size}
            level="H"
            includeMargin
          />
        );

        root.render(qrComponent); // Renderizar el componente QR

        // Esperar un momento para que el componente se renderice
        await new Promise(resolve => setTimeout(resolve, 100));

        const svg = qrContainer.querySelector('svg');
        if (!svg) {
          console.error('El SVG no se encontró en el contenedor.');
          return null;
        }

        document.body.removeChild(qrContainer); // Limpiar el contenedor después de usarlo
        return { svg, roomNumber: room.number };
      }));

      // Filtrar elementos nulos
      const validQRElements = qrElements.filter(Boolean);

      // Descargar cada QR con un pequeño retraso entre cada uno
      for (const { svg, roomNumber } of validQRElements) {
        await downloadSingleQR(svg, roomNumber);
        await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms entre descargas
      }
    } catch (error) {
      console.error('Error al descargar QRs:', error);
    } finally {
      setDownloading(false);
    }
  };

  return {
    downloadMultipleQRs,
    downloading,
  };
};

export default QRDownloadManager;