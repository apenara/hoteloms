'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ROOM_STATES } from '@/app/lib/constants/room-states';
import { Loader2, Paintbrush, TriangleAlertIcon, MessageSquare } from "lucide-react";

interface RoomHistoryTabsProps {
  roomId: string;
  hotelId: string;
}

// Definir tipos para los diferentes tipos de entradas históricas
interface BaseHistoryEntry {
  id: string;
  timestamp: Date;
  staffInfo?: {
    name: string;
    role: string;
    accessType?: string;
  };
}

interface StatusHistoryEntry extends BaseHistoryEntry {
  type: 'status';
  previousStatus: string;
  newStatus: string;
  notes: string;
}

interface MaintenanceHistoryEntry extends BaseHistoryEntry {
  type: 'maintenance';
  description: string;
  priority: string;
  status: string;
  completionNotes?: string;
}

interface RequestHistoryEntry extends BaseHistoryEntry {
  type: 'request';
  requestType: string;
  description: string;
  status: string;
}

type HistoryEntry = StatusHistoryEntry | MaintenanceHistoryEntry | RequestHistoryEntry;

export function RoomHistoryTabs({ roomId, hotelId }: RoomHistoryTabsProps) {
  // Estados para los diferentes tipos de historiales
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistoryEntry[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [staffCache, setStaffCache] = useState<Record<string, any>>({});

  // Función para obtener información del personal
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

  // Cargar historial de cambios de estado
  const fetchStatusHistory = async () => {
    try {
      const historialRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
      const q = query(historialRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      const historialData = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Preparar la entrada básica
        const entry: any = {
          id: doc.id,
          type: 'status',
          timestamp: data.timestamp?.toDate(),
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
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
        } else if (data.userName || data.staffMember?.name) {
          // Si no hay staffId pero hay userName (compatibilidad con registros antiguos)
          entry.staffInfo = {
            name: data.userName || data.staffMember?.name,
            role: data.userRole || data.staffMember?.role || 'Usuario',
            accessType: data.accessType || data.staffMember?.accessType
          };
        }

        return entry;
      }));

      // Filtramos solo entradas relacionadas con cambios de estado
      const statusEntries = historialData.filter(entry => 
        entry.previousStatus && entry.newStatus
      );
      
      setStatusHistory(statusEntries);
    } catch (error) {
      console.error('Error al cargar historial de estados:', error);
    }
  };

  // Cargar historial de mantenimiento
  const fetchMaintenanceHistory = async () => {
    try {
      // Obtener solicitudes de mantenimiento completadas y pendientes
      const maintenanceQuery = query(
        collection(db, 'hotels', hotelId, 'maintenance'),
        where('roomId', '==', roomId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(maintenanceQuery);
      
      const maintenanceData = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Crear entrada de historial de mantenimiento
        const entry: MaintenanceHistoryEntry = {
          id: doc.id,
          type: 'maintenance',
          timestamp: data.createdAt?.toDate(),
          description: data.description,
          priority: data.priority,
          status: data.status,
          completionNotes: data.completionNotes
        };
        
        // Agregar info del personal que creó o completó
        if (data.createdBy?.id) {
          const staffInfo = await fetchStaffInfo(data.createdBy.id);
          if (staffInfo) {
            entry.staffInfo = {
              name: data.createdBy.name || staffInfo.name,
              role: data.createdBy.role || staffInfo.role
            };
          } else if (data.createdBy.name) {
            entry.staffInfo = {
              name: data.createdBy.name,
              role: data.createdBy.role || 'Usuario'
            };
          }
        } else if (data.completedBy?.id) {
          const staffInfo = await fetchStaffInfo(data.completedBy.id);
          if (staffInfo) {
            entry.staffInfo = {
              name: data.completedBy.name || staffInfo.name,
              role: data.completedBy.role || staffInfo.role
            };
          } else if (data.completedBy.name) {
            entry.staffInfo = {
              name: data.completedBy.name,
              role: data.completedBy.role || 'Usuario'
            };
          }
        }
        
        return entry;
      }));
      
      setMaintenanceHistory(maintenanceData);
    } catch (error) {
      console.error('Error al cargar historial de mantenimiento:', error);
    }
  };

  // Cargar historial de solicitudes
  const fetchRequestHistory = async () => {
    try {
      // Obtener todas las solicitudes para esta habitación
      const requestsQuery = query(
        collection(db, 'hotels', hotelId, 'requests'),
        where('roomId', '==', roomId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(requestsQuery);
      
      const requestsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Crear entrada de historial de solicitud
        const entry: RequestHistoryEntry = {
          id: doc.id,
          type: 'request',
          timestamp: data.createdAt?.toDate(),
          requestType: data.type || 'general',
          description: data.description || data.message || 'Sin descripción',
          status: data.status
        };
        
        // Agregar información de quien creó la solicitud si está disponible
        if (data.createdBy) {
          entry.staffInfo = {
            name: data.createdBy.name,
            role: data.createdBy.role || 'Usuario'
          };
        } else if (data.source === 'guest_request') {
          entry.staffInfo = {
            name: 'Huésped',
            role: 'Huésped'
          };
        }
        
        return entry;
      });
      
      setRequestHistory(requestsData);
    } catch (error) {
      console.error('Error al cargar historial de solicitudes:', error);
    }
  };

  // Efecto para cargar todos los tipos de historial
  useEffect(() => {
    const loadAllHistory = async () => {
      try {
        setLoading(true);
        
        // Cargar los tres tipos de historial en paralelo
        await Promise.all([
          fetchStatusHistory(),
          fetchMaintenanceHistory(),
          fetchRequestHistory()
        ]);
      } catch (error) {
        console.error('Error al cargar historiales:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllHistory();
  }, [roomId, hotelId]);

  // Renderizar tabla de historial de estados
  const renderStatusHistoryTable = () => (
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
        {statusHistory.map((entry) => (
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
  );

  // Renderizar tabla de historial de mantenimiento
  const renderMaintenanceHistoryTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Responsable</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {maintenanceHistory.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.timestamp?.toLocaleString()}</TableCell>
            <TableCell>
              {entry.description}
              {entry.completionNotes && (
                <div className="text-xs text-gray-500 mt-1">
                  <strong>Notas de finalización:</strong> {entry.completionNotes}
                </div>
              )}
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded text-xs ${
                entry.priority === 'high' ? 'bg-red-100 text-red-800' :
                entry.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {entry.priority}
              </span>
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded text-xs ${
                entry.status === 'completed' ? 'bg-green-100 text-green-800' :
                entry.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {entry.status}
              </span>
            </TableCell>
            <TableCell>
              {entry.staffInfo ? (
                <div className="text-sm">
                  <div className="font-medium">{entry.staffInfo.name}</div>
                  <div className="text-xs text-gray-500">{entry.staffInfo.role}</div>
                </div>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Renderizar tabla de historial de solicitudes
  const renderRequestHistoryTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Solicitante</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requestHistory.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.timestamp?.toLocaleString()}</TableCell>
            <TableCell>
              {entry.requestType === 'maintenance' ? 'Mantenimiento' :
               entry.requestType === 'housekeeping' ? 'Limpieza' :
               entry.requestType === 'guest_request' ? 'Solicitud de huésped' :
               entry.requestType}
            </TableCell>
            <TableCell>{entry.description}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded text-xs ${
                entry.status === 'completed' ? 'bg-green-100 text-green-800' :
                entry.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {entry.status}
              </span>
            </TableCell>
            <TableCell>
              {entry.staffInfo ? (
                <div className="text-sm">
                  <div className="font-medium">{entry.staffInfo.name}</div>
                  <div className="text-xs text-gray-500">{entry.staffInfo.role}</div>
                </div>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <ScrollArea className="h-[400px]">
      {loading ? (
        <div className="flex justify-center items-center h-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="status">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4" />
              <span>Limpieza</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <TriangleAlertIcon className="h-4 w-4" />
              <span>Mantenimiento</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Solicitudes</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="mt-4">
            {statusHistory.length > 0 ? (
              renderStatusHistoryTable()
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay registros de cambios de estado
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="maintenance" className="mt-4">
            {maintenanceHistory.length > 0 ? (
              renderMaintenanceHistoryTable()
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay registros de mantenimiento
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="mt-4">
            {requestHistory.length > 0 ? (
              renderRequestHistoryTable()
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay registros de solicitudes
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </ScrollArea>
  );
}