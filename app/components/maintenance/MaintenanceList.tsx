"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Home,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { db } from "@/lib/firebase/config";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  Timestamp,
} from "firebase/firestore";

// Interfaces
interface MaintenanceItem {
  id: string;
  location: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  createdAt: any;
  scheduledFor?: any;
  assignedTo?: string;
  roomId?: string;
  completedAt?: any;
  notes?: string;
}

interface MaintenanceStaff {
  id: string;
  name: string;
  role: string;
  [key: string]: any;
}

interface MaintenanceListProps {
  maintenanceList: MaintenanceItem[];
  maintenanceStaff: MaintenanceStaff[];
  hotelId: string;
  onRefresh: () => void;
}

const MaintenanceList = ({
  maintenanceList,
  maintenanceStaff,
  hotelId,
  onRefresh,
}: MaintenanceListProps) => {
  const [selectedMaintenance, setSelectedMaintenance] =
    useState<MaintenanceItem | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  // Ordenar la lista de mantenimientos por fecha de creación (más reciente primero)
  const sortedMaintenanceList = maintenanceList.sort((a, b) => {
    return b.createdAt.seconds - a.createdAt.seconds;
  });

  // Completar una tarea
  const handleComplete = async () => {
    if (!selectedMaintenance || !completionNotes.trim() || !hotelId) return;

    setLoading(true);
    try {
      const timestamp = Timestamp.now();
      const maintenanceRef = doc(
        db,
        "hotels",
        hotelId,
        "maintenance",
        selectedMaintenance.id
      );

      await updateDoc(maintenanceRef, {
        status: "completed",
        completedAt: timestamp,
        completionNotes,
        lastUpdated: timestamp,
      });

      // Si hay una habitación asociada, actualizarla
      if (selectedMaintenance.roomId) {
        const roomRef = doc(
          db,
          "hotels",
          hotelId,
          "rooms",
          selectedMaintenance.roomId
        );
        await updateDoc(roomRef, {
          status: "available",
          currentMaintenance: null,
          lastMaintenance: timestamp,
        });
      }

      // Registro en historial
      const historyRef = collection(
        db,
        "hotels",
        hotelId,
        "maintenance_history"
      );
      await addDoc(historyRef, {
        maintenanceId: selectedMaintenance.id,
        action: "completed",
        notes: completionNotes,
        timestamp,
      });

      onRefresh();
      setShowCompletionDialog(false);
      setSelectedMaintenance(null);
      setCompletionNotes("");
    } catch (error) {
      console.error("Error al completar:", error);
      setError("Error al completar la tarea");
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (maintenance: MaintenanceItem) => {
    if (maintenance.status === "completed" || !maintenance.scheduledFor)
      return false;
    const scheduledDate = new Date(maintenance.scheduledFor.seconds * 1000);
    return scheduledDate < new Date();
  };

  const getStatusBadge = (status: string, isOverdueTask: boolean) => {
    const statusConfig = {
      pending: {
        color: isOverdueTask
          ? "bg-red-100 text-red-800"
          : "bg-yellow-100 text-yellow-800",
        label: isOverdueTask ? "Vencido" : "Pendiente",
        icon: isOverdueTask ? AlertTriangle : Clock,
      },
      in_progress: {
        color: "bg-blue-100 text-blue-800",
        label: "En Progreso",
        icon: Wrench,
      },
      completed: {
        color: "bg-green-100 text-green-800",
        label: "Completado",
        icon: CheckCircle2,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          <span>{config.label}</span>
        </div>
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      high: {
        color: "bg-red-100 text-red-800",
        label: "Alta",
      },
      medium: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Media",
      },
      low: {
        color: "bg-green-100 text-green-800",
        label: "Baja",
      },
    };

    const priorityConfig =
      config[priority as keyof typeof config] || config.medium;

    return (
      <Badge className={priorityConfig.color}>
        Prioridad: {priorityConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {sortedMaintenanceList.map((maintenance) => (
        <Card key={maintenance.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{maintenance.location}</span>
                  {getPriorityBadge(maintenance.priority)}
                  {getStatusBadge(maintenance.status, isOverdue(maintenance))}
                </div>

                <p className="text-sm text-gray-600">
                  {maintenance.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Creado:{" "}
                    {new Date(
                      maintenance.createdAt.seconds * 1000
                    ).toLocaleString()}
                  </span>
                  {maintenance.scheduledFor && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Programado:{" "}
                      {new Date(
                        maintenance.scheduledFor.seconds * 1000
                      ).toLocaleString()}
                    </span>
                  )}
                  {maintenance.assignedTo && (
                    <span>
                      Asignado a:{" "}
                      {
                        maintenanceStaff.find(
                          (s) => s.id === maintenance.assignedTo
                        )?.name
                      }
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!maintenance.assignedTo &&
                  maintenance.status !== "completed" && (
                    <span className="text-gray-500">Sin asignar</span>
                  )}

                {maintenance.status !== "completed" &&
                  maintenance.assignedTo && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMaintenance(maintenance);
                        setShowCompletionDialog(true);
                      }}
                    >
                      Completar
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Diálogo de Asignación */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Mantenimiento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Personal de Mantenimiento</Label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar personal" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Límite</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            {/* <Button
              onClick={handleAssignStaff}
              disabled={loading || !selectedStaffId || !scheduledDate}
            >
              {loading ? "Asignando..." : "Asignar"}
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Completar */}
      <Dialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Mantenimiento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notas de Finalización</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe el trabajo realizado..."
                rows={4}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompletionDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleComplete}
              disabled={loading || !completionNotes.trim()}
            >
              {loading ? "Guardando..." : "Completar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Exportación por defecto
export default MaintenanceList;
