"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowUpDown,
  Tag,
  Wrench,
  Tool,
  Edit,
  FileQuestion,
  Home,
  Loader2,
  History,
} from "lucide-react";

interface AssetHistoryEntry {
  id: string;
  type:
    | "creation"
    | "transfer"
    | "status_change"
    | "maintenance_request"
    | "maintenance_complete"
    | "update";
  date: Date;
  description: string;
  userName: string;
  userId: string;
  roomId?: string;
  previousRoomId?: string;
  previousStatus?: string;
  newStatus?: string;
  maintenanceId?: string;
  maintenanceDescription?: string;
}

interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
}

interface AssetHistoryProps {
  assetId: string;
  hotelId: string;
}

export default function AssetHistory({ assetId, hotelId }: AssetHistoryProps) {
  const [history, setHistory] = useState<AssetHistoryEntry[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar el historial del activo
  useEffect(() => {
    if (!hotelId || !assetId) return;

    setLoading(true);

    // Cargar todas las habitaciones para referencia en el historial
    const fetchRooms = async () => {
      try {
        const roomsRef = collection(db, "hotels", hotelId, "rooms");
        const roomsSnap = await getDoc(doc(roomsRef));
        const roomsData = roomsSnap.docs.reduce((acc, doc) => {
          return { ...acc, [doc.id]: { id: doc.id, ...doc.data() } };
        }, {});
        setRooms(roomsData);
      } catch (error) {
        console.error("Error al cargar habitaciones:", error);
      }
    };

    // Configurar el listener para el historial
    const historyRef = collection(
      db,
      "hotels",
      hotelId,
      "assets",
      assetId,
      "history"
    );
    const historyQuery = query(historyRef, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const historyData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate() || new Date(),
          } as AssetHistoryEntry;
        });
        setHistory(historyData);
        setLoading(false);
      },
      (error) => {
        console.error("Error al cargar historial:", error);
        setError("Error al cargar el historial del activo");
        setLoading(false);
      }
    );

    fetchRooms();

    return () => unsubscribe();
  }, [hotelId, assetId]);

  // Renderizar tipo de entrada con icono y badge
  const renderEntryType = (type: string) => {
    const typeConfig = {
      creation: {
        icon: <Package className="h-4 w-4" />,
        label: "Creación",
        color: "bg-blue-100 text-blue-800",
      },
      transfer: {
        icon: <ArrowUpDown className="h-4 w-4" />,
        label: "Traslado",
        color: "bg-purple-100 text-purple-800",
      },
      status_change: {
        icon: <Tag className="h-4 w-4" />,
        label: "Cambio de Estado",
        color: "bg-amber-100 text-amber-800",
      },
      maintenance_request: {
        icon: <Wrench className="h-4 w-4" />,
        label: "Solicitud de Mantenimiento",
        color: "bg-yellow-100 text-yellow-800",
      },
      maintenance_complete: {
        icon: <Tool className="h-4 w-4" />,
        label: "Mantenimiento Completado",
        color: "bg-green-100 text-green-800",
      },
      update: {
        icon: <Edit className="h-4 w-4" />,
        label: "Actualización",
        color: "bg-gray-100 text-gray-800",
      },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || {
      icon: <FileQuestion className="h-4 w-4" />,
      label: type,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <div className="flex items-center">
        <Badge className={`flex items-center gap-1 ${config.color}`}>
          {config.icon}
          <span>{config.label}</span>
        </Badge>
      </div>
    );
  };

  // Obtener nombre de habitación a partir del ID
  const getRoomInfo = (roomId?: string) => {
    if (!roomId) return "No asignada";

    if (rooms[roomId]) {
      return `Habitación ${rooms[roomId].number} (Piso ${rooms[roomId].floor})`;
    }

    return roomId;
  };

  // Renderizar detalles según el tipo de entrada
  const renderEntryDetails = (entry: AssetHistoryEntry) => {
    switch (entry.type) {
      case "transfer":
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Home className="h-3 w-3 text-gray-400" />
              <span>De: {getRoomInfo(entry.previousRoomId)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Home className="h-3 w-3 text-gray-400" />
              <span>A: {getRoomInfo(entry.roomId)}</span>
            </div>
          </div>
        );

      case "status_change":
        return (
          <div className="text-sm">
            <div>
              <strong>De:</strong> {entry.previousStatus}
            </div>
            <div>
              <strong>A:</strong> {entry.newStatus}
            </div>
          </div>
        );

      case "maintenance_request":
      case "maintenance_complete":
        return (
          <div className="text-sm">
            {entry.maintenanceDescription && (
              <div>
                <strong>Detalle:</strong> {entry.maintenanceDescription}
              </div>
            )}
            {entry.maintenanceId && (
              <div>
                <strong>ID:</strong> {entry.maintenanceId}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-800 rounded-md">{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
        <p>No hay registros en el historial</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Detalles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.date.toLocaleString()}</TableCell>
              <TableCell>{renderEntryType(entry.type)}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell>
                <div className="text-sm">{entry.userName}</div>
              </TableCell>
              <TableCell>{renderEntryDetails(entry)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
