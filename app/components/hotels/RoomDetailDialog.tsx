'use client';

// src/components/hotels/RoomDetailDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface RoomDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  hotelId: string;
}

export function RoomDetailDialog({ isOpen, onClose, room, hotelId }: RoomDetailDialogProps) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        setLoading(true);
        const historialRef = collection(db, 'hotels', hotelId, 'rooms', room.id, 'history');
        const q = query(historialRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        
        const historialData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));

        setHistorial(historialData);
      } catch (error) {
        console.error('Error al cargar historial:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && room.id) {
      fetchHistorial();
    }
  }, [isOpen, room.id, hotelId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Habitación {room.number}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1">
          <TabsList>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-semibold">Número:</p>
                <p>{room.number}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Estado:</p>
                <p>{room.status}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Tipo:</p>
                <p>{room.type}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Última Limpieza:</p>
                <p>{room.lastCleaning ? new Date(room.lastCleaning).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado Anterior</TableHead>
                    <TableHead>Nuevo Estado</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.timestamp?.toLocaleString()}</TableCell>
                      <TableCell>{entry.previousStatus}</TableCell>
                      <TableCell>{entry.newStatus}</TableCell>
                      <TableCell>{entry.userName}</TableCell>
                      <TableCell>{entry.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}