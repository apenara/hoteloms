// src/app/(hotel)/qr-manager/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';

export default function QRManager() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [qrSize, setQrSize] = useState(256);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar rol de usuario
    if (user && user.role !== 'hotel_admin') {
      router.push('/dashboard');
      return;
    }

    const fetchRooms = async () => {
      if (!user?.hotelId) return;

      try {
        const roomsRef = collection(db, 'hotels', user.hotelId, 'rooms');
        const snapshot = await getDocs(query(roomsRef));
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRooms(roomsData);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [user, router]);

  const toggleRoom = (roomId) => {
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      newSelected.add(roomId);
    }
    setSelectedRooms(newSelected);
  };

  const selectAllRooms = () => {
    const allRoomIds = rooms.map(room => room.id);
    setSelectedRooms(new Set(allRoomIds));
  };

  const deselectAllRooms = () => {
    setSelectedRooms(new Set());
  };

  const downloadQR = (roomId, roomNumber) => {
    const svg = document.getElementById(`qr-${roomId}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = qrSize;
      canvas.height = qrSize;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-Habitacion-${roomNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const downloadSelectedQRs = () => {
    selectedRooms.forEach(roomId => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        downloadQR(room.id, room.number);
      }
    });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestor de Códigos QR</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single">
            <TabsList>
              <TabsTrigger value="single">QR Individual</TabsTrigger>
              <TabsTrigger value="multiple">QR Múltiple</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(room => (
                  <Card key={room.id}>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-4">
                        <div>Habitación {room.number}</div>
                        <div className="flex justify-center">
                          <QRCodeSVG
                            id={`qr-${room.id}`}
                            value={`${window.location.origin}/rooms/${user.hotelId}/${room.id}`}
                            size={qrSize}
                            level="H"
                            includeMargin
                          />
                        </div>
                        <Button onClick={() => downloadQR(room.id, room.number)}>
                          Descargar QR
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="multiple" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={selectAllRooms}>Seleccionar Todas</Button>
                  <Button onClick={deselectAllRooms} variant="outline">
                    Deseleccionar Todas
                  </Button>
                  <select
                    className="border rounded-md px-3 py-2"
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                  >
                    <option value="128">Pequeño (128px)</option>
                    <option value="256">Mediano (256px)</option>
                    <option value="512">Grande (512px)</option>
                    <option value="1024">Muy Grande (1024px)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rooms.map(room => (
                    <div key={room.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`room-${room.id}`}
                        checked={selectedRooms.has(room.id)}
                        onCheckedChange={() => toggleRoom(room.id)}
                      />
                      <label htmlFor={`room-${room.id}`}>
                        Habitación {room.number}
                      </label>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={downloadSelectedQRs}
                  disabled={selectedRooms.size === 0}
                >
                  Descargar {selectedRooms.size} QR(s)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}