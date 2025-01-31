"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  updateDoc,
  doc,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle,
  BedDouble,
  Paintbrush,
  AlertTriangle,
  Loader2,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceFormDialog from "@/components/maintenance/MaintenanceFormDialog";
import { Maintenance, User } from "@/app/lib/types";
import StaffEfficiencyView from "@/components/maintenance/StaffEfficiencyView";

// Interfaces
interface MaintenanceItem extends Maintenance {
  roomNumber?: string;
}

interface MaintenanceStaff {
  id: string;
  name: string;
  role: string;
  status?: string;
  shift?: string;
  [key: string]: any;
}

interface SelectedAssignment {
  maintenanceId: string;
  staffId: string;
}

interface StaffStats {
  total: number;
  completed: number;
  pending: number;
  efficiency: number;
  avgCompletionTime: number;
  completionTimes: number[];
}

const MaintenancePage = () => {
  const { user } = useAuth() as { user: User | null };
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState<MaintenanceStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceItem | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [showDueDateDialog, setShowDueDateDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<SelectedAssignment | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<MaintenanceStaff | null>(null);
  const [error, setError] = useState<string | null>(null);

// Primero definimos las interfaces necesarias
interface MaintenanceItem extends Maintenance {
  roomNumber?: string;
  requestType?: string;
  sourceType?: string;
}

interface MaintenanceRequest {
  id: string;
  roomId?: string;
  roomNumber?: string;
  type: 'corrective' | 'preventive';
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  createdAt: Timestamp;
  staffId?: string;
  category?: string;
  scheduledFor?: Timestamp;
  requestType?: string;
  sourceType?: string;
}

const fetchMaintenanceList = async () => {
  try {
    if (!user?.hotelId) return;
    
    // 1. Obtener mantenimientos programados
    const maintenanceRef = collection(db, "hotels", user.hotelId, "maintenance");
    const maintenanceSnap = await getDocs(query(maintenanceRef, orderBy("createdAt", "desc")));
    const maintenanceData = maintenanceSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MaintenanceItem[];

    // 2. Obtener solicitudes de mantenimiento desde las habitaciones
    const requestsRef = collection(db, "hotels", user.hotelId, "requests");
    const requestsQuery = query(
      requestsRef,
      where("type", "in", ["maintenance", "need_maintenance"]),
      where("status", "in", ["pending", "new"])
    );
    
    const requestsSnap = await getDocs(requestsQuery);
    const requestsData: MaintenanceRequest[] = requestsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        roomId: data.roomId || undefined,
        roomNumber: data.roomNumber || undefined,
        type: "corrective",
        status: "pending",
        priority: "medium",
        location: `Habitación ${data.roomNumber || 'Sin especificar'}`,
        description: data.description || data.message || "Solicitud de mantenimiento",
        createdAt: data.createdAt || Timestamp.now(),
        staffId: data.staffId || undefined,
        category: data.category || 'general',
        scheduledFor: data.scheduledFor || undefined,
        requestType: data.type,
        sourceType: "room_request"
      };
    });

    console.log('Mantenimientos programados:', maintenanceData.length);
    console.log('Solicitudes de habitaciones:', requestsData.length);

    // Asegurarnos de que todos los campos requeridos estén presentes
    const combinedData: MaintenanceItem[] = [
      ...maintenanceData,
      ...requestsData as MaintenanceItem[]
    ];

    setMaintenanceList(combinedData);
    setLoading(false);
  } catch (error) {
    console.error("Error al cargar mantenimientos:", error);
    setError("Error al cargar la lista de mantenimientos");
    setLoading(false);
  }
};
  const fetchMaintenanceStaff = async () => {
    try {
      if (!user?.hotelId) return;
      
      const staffRef = collection(db, "hotels", user.hotelId, "staff");
      const staffQuery = query(staffRef, where("role", "==", "maintenance"));
      const staffSnap = await getDocs(staffQuery);
      
      const staffData = staffSnap.docs.map((doc) => {
        const data = doc.data();
        const staff: MaintenanceStaff = {
          id: doc.id,
          name: data.name || '',
          role: data.role || 'maintenance',
          ...data
        };
        return staff;
      });
      
      setMaintenanceStaff(staffData);
    } catch (error) {
      console.error("Error:", error);
      setError("Error al cargar el personal de mantenimiento");
    }
  };

  useEffect(() => {
    if (user?.hotelId) {
      fetchMaintenanceList();
      fetchMaintenanceStaff();
    }
  }, [user]);

  const handleCompleteMaintenance = async (maintenance: MaintenanceItem, notes: string) => {
    try {
      if (!user?.hotelId) return;
  
      // Si es una solicitud de habitación, actualizamos la solicitud original
      if (maintenance.sourceType === "room_request") {
        const requestRef = doc(db, "hotels", user.hotelId, "requests", maintenance.id);
        await updateDoc(requestRef, {
          status: "completed",
          completedAt: Timestamp.now(),
          completedBy: user.uid,
          notes: notes,
          resolution: "Mantenimiento completado"
        });
      } else {
        // Si es un mantenimiento programado, actualizamos el registro de mantenimiento
        const maintenanceRef = doc(
          db,
          "hotels",
          user.hotelId,
          "maintenance",
          maintenance.id
        );
        await updateDoc(maintenanceRef, {
          status: "completed",
          completedAt: Timestamp.now(),
          notes,
          completedBy: user.uid,
        });
      }
  
      // Si hay una habitación asociada, actualizamos su estado
      if (maintenance.roomId) {
        const roomRef = doc(
          db,
          "hotels",
          user.hotelId,
          "rooms",
          maintenance.roomId
        );
        await updateDoc(roomRef, {
          status: "available",
          maintenanceStatus: null,
          currentMaintenance: null,
          lastMaintenance: Timestamp.now()
        });
      }
  
      // Actualizamos la lista de mantenimientos
      fetchMaintenanceList();
    } catch (error) {
      console.error("Error al completar el mantenimiento:", error);
      setError("Error al completar el mantenimiento");
    }
  };

  const handleAssignStaff = (maintenanceId: string, staffId: string) => {
    setSelectedAssignment({ maintenanceId, staffId });
    setShowDueDateDialog(true);
  };

  const filterMaintenance = (maintenance: MaintenanceItem) => {
    const searchMatch =
      maintenance.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.description.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = activeTab === "all" || maintenance.status === activeTab;
    return searchMatch && statusMatch;
  };

  const isOverdue = (maintenance: MaintenanceItem) => {
    if (maintenance.status === "completed" || !maintenance.scheduledFor) return false;
    const scheduledDate = new Date(maintenance.scheduledFor.seconds * 1000);
    return scheduledDate < new Date();
  };

  type MaintenanceStatus = 'pending' | 'in_progress' | 'completed';

  const getStatusBadge = (status: MaintenanceStatus, isOverdueTask: boolean) => {
    const statusColors: Record<MaintenanceStatus, string> = {
      pending: isOverdueTask ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };

    const statusLabels: Record<MaintenanceStatus, string> = {
      pending: isOverdueTask ? "Vencido" : "Pendiente",
      in_progress: "En Progreso",
      completed: "Completado",
    };

    return (
      <Badge className={statusColors[status]}>
        {statusLabels[status]}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-orange-100 text-orange-800",
      low: "bg-gray-100 text-gray-800",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };
    return labels[priority as keyof typeof labels] || "Media";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
 
 
 return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mantenimientos</CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Mantenimiento
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por ubicación o descripción..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="in_progress">En Progreso</TabsTrigger>
              <TabsTrigger value="completed">Completados</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {maintenanceList.filter(filterMaintenance).map((maintenance) => {
                  const isOverdueTask = isOverdue(maintenance);
                  const assignedStaff = maintenanceStaff.find(
                    (s) => s.id === maintenance.assignedTo
                  );

                  return (
                    <div key={maintenance.id} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{maintenance.location}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {maintenance.description}
                          </div>
                          <div className="flex items-center mt-2 space-x-2">
                            {getStatusBadge(
                              maintenance.status as MaintenanceStatus,
                              isOverdueTask
                            )}
                            <Badge className={getPriorityColor(maintenance.priority)}>
                              {getPriorityLabel(maintenance.priority)}
                            </Badge>
                            <div className="text-sm text-gray-500">
                              {maintenance.scheduledFor
                                ? `Vence: ${new Date(
                                    maintenance.scheduledFor.seconds * 1000
                                  ).toLocaleDateString()}`
                                : "Sin fecha asignada"}
                            </div>
                            {assignedStaff && (
                              <span className="text-sm text-gray-500">
                                Asignado a: {assignedStaff.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!maintenance.assignedTo &&
                            maintenance.status !== "completed" && (
                              <Select
                                onValueChange={(value) =>
                                  handleAssignStaff(maintenance.id, value)
                                }
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Asignar personal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {maintenanceStaff.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                      {staff.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          {maintenance.status !== "completed" &&
                            maintenance.assignedTo && (
                              <Button
                                onClick={() => setSelectedMaintenance(maintenance)}
                                variant="outline"
                              >
                                Completar
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showAddDialog && (
        <MaintenanceFormDialog
          hotelId={user?.hotelId}
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            fetchMaintenanceList();
          }}
        />
      )}

      {showDueDateDialog && selectedAssignment && (
        <AssignDueDateDialog
          onClose={() => {
            setShowDueDateDialog(false);
            setSelectedAssignment(null);
          }}
          onSubmit={async (dueDate: string) => {
            try {
              if (!user?.hotelId || !selectedAssignment) return;

              const maintenanceRef = doc(
                db,
                "hotels",
                user.hotelId,
                "maintenance",
                selectedAssignment.maintenanceId
              );
              await updateDoc(maintenanceRef, {
                assignedTo: selectedAssignment.staffId,
                status: "in_progress",
                scheduledFor: Timestamp.fromDate(new Date(dueDate)),
              });
              fetchMaintenanceList();
              setShowDueDateDialog(false);
              setSelectedAssignment(null);
            } catch (error) {
              console.error("Error:", error);
              setError("Error al asignar la fecha límite");
            }
          }}
        />
      )}

      {selectedMaintenance && (
        <CompletionDialog
          maintenance={selectedMaintenance}
          onClose={() => setSelectedMaintenance(null)}
          onComplete={(notes) =>
            handleCompleteMaintenance(selectedMaintenance, notes)
          }
        />
      )}
    </div>
  );
};

interface AssignDueDateDialogProps {
  onClose: () => void;
  onSubmit: (dueDate: string) => void;
}

const AssignDueDateDialog = ({ onClose, onSubmit }: AssignDueDateDialogProps) => {
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Fecha Límite</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Fecha de vencimiento</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(dueDate)}>Asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface CompletionDialogProps {
  maintenance: MaintenanceItem;
  onClose: () => void;
  onComplete: (notes: string) => void;
}

const CompletionDialog = ({ maintenance, onClose, onComplete }: CompletionDialogProps) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    await onComplete(notes);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Completar Mantenimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Ubicación</h4>
            <p className="text-sm text-gray-500">{maintenance.location}</p>
          </div>
          <div>
            <h4 className="font-medium">Descripción</h4>
            <p className="text-sm text-gray-500">{maintenance.description}</p>
          </div>
          <div className="space-y-2">
            <Label>Notas de Finalización</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe el trabajo realizado..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? "Guardando..." : "Completar Mantenimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenancePage;