'use client';

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
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
import { ROOM_STATES } from '@/app/lib/constants/room-states';
import { Loader2 } from "lucide-react";
import { RoomHistoryTabs } from "../history/RoomHistoryTabs";

interface RoomDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  hotelId: string;
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  previousStatus: string;
  newStatus: string;
  staffId: string;
  notes: string;
  staffInfo?: {
    name: string;
    role: string;
    accessType?: string;
  };
}

export function RoomDetailDialog({ isOpen, onClose, room, hotelId }: RoomDetailDialogProps) {
  const [historial, setHistorial] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffCache, setStaffCache] = useState<Record<string, any>>({});
  const [lastCleaningDate, setLastCleaningDate] = useState<Date | null>(null); // New state variable

  // Función para obtener la información del staff
  const fetchStaffInfo = async (staffId: string) => {
    if (staffCache[staffId]) return staffCache[staffId];

    try {
      const staffDoc = await getDoc(doc(db, 'hotels', hotelId, 'staff', staffId));
      if (staffDoc.exists()) {
        const staffData = staffDoc.data();
        setStaffCache(prev => ({ ...prev, [staffId]: staffData }));
        return staffData;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener información del staff:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        setLoading(true);
        const historialRef = collection(db, 'hotels', hotelId, 'rooms', room.id, 'history');
        const q = query(historialRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        const historialData = await Promise.all(snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const entry: HistoryEntry = {
            id: doc.id,
            timestamp: data.timestamp?.toDate(),
            previousStatus: data.previousStatus,
            newStatus: data.newStatus,
            staffId: data.staffId,
            notes: data.notes || 'Sin notas'
          };

          // Si hay un staffId, obtener la información
          if (data.staffId) {
            const staffInfo = await fetchStaffInfo(data.staffId);
            if (staffInfo) {
              entry.staffInfo = {
                name: staffInfo.name,
                role: staffInfo.role,
                accessType: staffInfo.accessType
              };
            }
          }

          return entry;
        }));

        setHistorial(historialData);

        // Find the last cleaning date
        const lastCleaningEntry = historialData.find(entry => {
          return entry.newStatus && (entry.newStatus.startsWith("clean") || entry.newStatus === "dirty");
        });

        if (lastCleaningEntry) {
          setLastCleaningDate(lastCleaningEntry.timestamp);
        } else {
          setLastCleaningDate(null);
        }
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
                <p>{ROOM_STATES[room.status]?.label || room.status}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Tipo:</p>
                <p>{room.type}</p>
              </div>
              {/* <div className="space-y-2">
                <p className="font-semibold">Último Estado </p>
                <p>{ROOM_STATES[entry.previousStatus]?.label || entry.previousStatus}</p>
              </div> */}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
          <RoomHistoryTabs roomId={room.id} hotelId={hotelId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
