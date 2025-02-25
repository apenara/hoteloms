//Aqui se ven las habitaciones y se pueden descargar los codigos QR de las mismas
//Se pueden descargar de una en una o de varias a la vez
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRDownloadManager from '@/app/components/qr/QrDownloadManager';

export default function QRManager() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [qrSize, setQrSize] = useState(256);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { downloadMultipleQRs, downloading } = QRDownloadManager({
    rooms,
    hotelId: user?.hotelId,
    size: qrSize
  });

  useEffect(() => {
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
        setError('Error al cargar las habitaciones');
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

  const downloadSingleQR = async (roomId, roomNumber) => {
    const svg = document.getElementById(`qr-${roomId}`);
    if (!svg) {
      console.error('SVG element not found');
      return;
    }

    try {
      await downloadMultipleQRs([roomId]);
    } catch (error) {
      console.error('Error downloading QR:', error);
      setError('Error al descargar el código QR');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestor de Códigos QR</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                        <Button 
                          onClick={() => downloadSingleQR(room.id, room.number)}
                          disabled={downloading}
                        >
                          {downloading ? 'Descargando...' : 'Descargar QR'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="multiple" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-4 flex-wrap">
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
                  onClick={() => downloadMultipleQRs(Array.from(selectedRooms))}
                  disabled={selectedRooms.size === 0 || downloading}
                >
                  {downloading 
                    ? 'Descargando...' 
                    : `Descargar ${selectedRooms.size} QR(s)`}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}