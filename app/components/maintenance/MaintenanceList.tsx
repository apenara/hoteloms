import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ImageGallery from "./ImageGallery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import MaintenanceStatsSummary from "./MaintenanceStatsSummary";
import MaintenanceFilters from "./MaintenanceFilters";
import { toast } from "@/app/hooks/use-toast";

interface MaintenanceListProps {
  maintenanceList: any[];
  maintenanceStaff: any[];
  onRefresh: () => void;
  hotelId: string;
}

const MaintenanceList = ({
  maintenanceList,
  maintenanceStaff,
  onRefresh,
  hotelId,
}: MaintenanceListProps) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Función auxiliar para formatear fechas de manera segura
  const formatDate = (date: any) => {
    try {
      if (!date) return "Fecha no disponible";

      // Si es un Timestamp de Firestore
      if (date?.seconds) {
        return format(new Date(date.seconds * 1000), "d 'de' MMMM, yyyy", {
          locale: es,
        });
      }

      // Si es un objeto Date
      if (date instanceof Date) {
        return format(date, "d 'de' MMMM, yyyy", { locale: es });
      }

      // Si es un string o timestamp en milisegundos
      return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Fecha no disponible";
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStatusChange = async (
    maintenanceId: string,
    newStatus: string
  ) => {
    try {
      const maintenanceRef = doc(
        db,
        "hotels",
        hotelId,
        "maintenance",
        maintenanceId
      );
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === "completed") {
        updateData.completedAt = new Date();
      }

      await updateDoc(maintenanceRef, updateData);

      toast({
        title: "Estado actualizado",
        description: "El estado del mantenimiento ha sido actualizado",
      });

      onRefresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completado";
      case "in_progress":
        return "En Progreso";
      case "pending":
        return "Pendiente";
      default:
        return status;
    }
  };

  if (!maintenanceList?.length) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          No hay mantenimientos registrados
        </div>
      </Card>
    );
  }

  // Función para filtrar y ordenar la lista
  const getFilteredAndSortedList = () => {
    let filteredList = [...maintenanceList];

    // Aplicar filtro por estado
    if (statusFilter !== "all") {
      filteredList = filteredList.filter(
        (item) => item.status === statusFilter
      );
    }

    // Ordenar la lista
    filteredList.sort((a, b) => {
      const dateA = a.createdAt?.seconds
        ? new Date(a.createdAt.seconds * 1000)
        : new Date(a.createdAt);
      const dateB = b.createdAt?.seconds
        ? new Date(b.createdAt.seconds * 1000)
        : new Date(b.createdAt);

      return sortOrder === "newest"
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    return filteredList;
  };

  const filteredAndSortedList = getFilteredAndSortedList();

  return (
    <div className="space-y-4">
      <MaintenanceStatsSummary maintenanceList={maintenanceList} />
      <MaintenanceFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        totalCount={filteredAndSortedList.length}
      />
      {filteredAndSortedList.map((maintenance) => (
        <Card key={maintenance.id} className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">
                    {maintenance.location ||
                      `Habitación ${maintenance.roomNumber}`}
                  </h3>
                  <Badge className={getPriorityColor(maintenance.priority)}>
                    Prioridad{" "}
                    {maintenance.priority === "high"
                      ? "Alta"
                      : maintenance.priority === "medium"
                      ? "Media"
                      : "Baja"}
                  </Badge>
                  <Badge className={getStatusColor(maintenance.status)}>
                    {getStatusLabel(maintenance.status)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  Creado el {formatDate(maintenance.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(maintenance.id)}
              >
                {expandedItems.includes(maintenance.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-gray-600">{maintenance.description}</p>

            {/* Mostrar imágenes si existen */}
            {(maintenance.images?.length > 0 ||
              maintenance.completionImages?.length > 0) && (
              <div className="mt-4 space-y-4">
                {/* Imágenes del reporte inicial */}
                {maintenance.images?.length > 0 && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Imágenes del Reporte
                    </h4>
                    <ImageGallery
                      images={maintenance.images}
                      thumbnailSize="small"
                    />
                  </div>
                )}

                {/* Imágenes del trabajo completado */}
                {maintenance.completionImages?.length > 0 && (
                  <div className="rounded-lg bg-green-50 p-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Imágenes del Trabajo Completado
                      <span className="text-xs text-gray-500">
                        ({formatDate(maintenance.completedAt)})
                      </span>
                    </h4>
                    <ImageGallery
                      images={maintenance.completionImages}
                      thumbnailSize="small"
                    />
                    {maintenance.completionNotes && (
                      <p className="mt-2 text-sm text-gray-600 border-t border-green-100 pt-2">
                        <span className="font-medium">
                          Notas de finalización:
                        </span>{" "}
                        {maintenance.completionNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {expandedItems.includes(maintenance.id) && (
              <div className="pt-4 border-t space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Asignado
                    </label>
                    <div className="mt-1">
                      {maintenance.assignedTo
                        ? maintenanceStaff.find(
                            (s) => s.id === maintenance.assignedTo
                          )?.name || "Personal no encontrado"
                        : "Sin asignar"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fecha Programada
                    </label>
                    <div className="mt-1">
                      {maintenance.scheduledFor
                        ? formatDate(maintenance.scheduledFor)
                        : "No programado"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {maintenance.status !== "completed" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(maintenance.id, "in_progress")
                        }
                        disabled={maintenance.status === "in_progress"}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        En Progreso
                      </Button>
                      <Button
                        onClick={() =>
                          handleStatusChange(maintenance.id, "completed")
                        }
                        disabled={maintenance.status === "completed"}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Completar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MaintenanceList;
