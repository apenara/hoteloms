'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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

interface RoomHistoryProps {
  roomId: string;
  hotelId: string;
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  previousStatus: string;
  newStatus: string;
  staffId?: string;
  userId?: string;
  notes: string;
  staffInfo?: {
    name: string;
    role: string;
    accessType?: string;
  };
}

export function RoomHistory({ roomId, hotelId }: RoomHistoryProps) {
  const [historial, setHistorial] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffCache, setStaffCache] = useState<Record<string, any>>({});

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
        const historialRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
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
            userId: data.userId,
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
          } else if (data.userName) {
            // Si no hay staffId pero hay userName (para compatibilidad con registros antiguos)
            entry.staffInfo = {
              name: data.userName,
              role: data.userRole || 'Usuario',
              accessType: data.accessType
            };
          }

          return entry;
        }));

        setHistorial(historialData);
      } catch (error) {
        console.error('Error al cargar historial:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [roomId, hotelId]);

  return (
    <ScrollArea className="h-[400px]">
      {loading ? (
        <div className="flex justify-center items-center h-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
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
                <TableCell>
                  {ROOM_STATES[entry.previousStatus]?.label || entry.previousStatus}
                </TableCell>
                <TableCell>
                  {ROOM_STATES[entry.newStatus]?.label || entry.newStatus}
                </TableCell>
                <TableCell>
                  {entry.staffInfo ? (
                    <div className="text-sm">
                      <div className="font-medium">{entry.staffInfo.name}</div>
                      <div className="text-xs text-gray-500">
                        {entry.staffInfo.role}
                        {entry.staffInfo.accessType && ` (${entry.staffInfo.accessType})`}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Sistema</span>
                  )}
                </TableCell>
                <TableCell>{entry.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ScrollArea>
  );
}