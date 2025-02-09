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
  Timestamp,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, Badge, Check, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceFormDialog from "@/components/maintenance/MaintenanceFormDialog";
import MaintenanceStats from "@/components/maintenance/MaintenanceStats";
import StaffEfficiencyView from "@/components/maintenance/StaffEfficiencyView";
import MaintenanceList from "@/app/components/maintenance/MaintenanceList";
import { toast } from "@/app/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import MaintenanceRequestCard from "@/app/components/maintenance/MaintenanceRequestCard";

const MaintenancePage = () => {
  const { user } = useAuth();
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null);

  // Función para cargar datos de mantenimiento
  const fetchMaintenanceData = async () => {
    try {
      if (!user?.hotelId) return;
      setLoading(true);

      // 1. Obtener solicitudes pendientes de mantenimiento
      const requestsRef = collection(db, "hotels", user.hotelId, "requests");
      const requestsQuery = query(
        requestsRef,
        where("type", "==", "maintenance"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsData = requestsSnap.docs.map((doc) => ({
        id: doc.id,
        isRequest: true,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));
      setPendingRequests(requestsData);

      // 2. Obtener mantenimientos existentes
      const maintenanceRef = collection(
        db,
        "hotels",
        user.hotelId,
        "maintenance"
      );
      const maintenanceSnap = await getDocs(maintenanceRef);
      const maintenanceData = maintenanceSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMaintenanceList([...requestsData, ...maintenanceData]);

      // 3. Obtener personal de mantenimiento
      const staffRef = collection(db, "hotels", user.hotelId, "staff");
      const staffQuery = query(staffRef, where("role", "==", "maintenance"));
      const staffSnap = await getDocs(staffQuery);
      const staffData = staffSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMaintenanceStaff(staffData);
    } catch (error) {
      console.error("Error:", error);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // Modificar la función convertRequestToMaintenance
  const convertRequestToMaintenance = async (
    request,
    staffId,
    scheduledDate
  ) => {
    try {
      const maintenanceRef = collection(
        db,
        "hotels",
        user.hotelId,
        "maintenance"
      );

      // Crear mantenimiento
      await addDoc(maintenanceRef, {
        roomId: request.roomId,
        roomNumber: request.roomNumber,
        location: request.location || `Habitación ${request.roomNumber}`,
        description: request.description,
        priority: request.priority || "medium",
        status: "pending",
        assignedTo: staffId,
        type: request.maintenanceType || "corrective",
        requiresBlocking: request.requiresBlocking || false,
        scheduledFor: Timestamp.fromDate(new Date(scheduledDate)),
        createdAt: request.createdAt || Timestamp.now(),
        source: request.source || "staff_request",
      });

      // Actualizar estado de la solicitud
      const requestRef = doc(
        db,
        "hotels",
        user.hotelId,
        "requests",
        request.id
      );
      await updateDoc(requestRef, {
        status: "in_progress",
        assignedTo: staffId,
        assignedAt: Timestamp.now(),
      });

      await fetchMaintenanceData();

      toast({
        title: "Solicitud asignada",
        description: "Se ha creado el mantenimiento correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo asignar la solicitud",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.hotelId) {
      fetchMaintenanceData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header y componentes existentes */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar mantenimientos..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Mantenimiento
        </Button>
      </div>

      {/* Mostrar solicitudes pendientes si existen */}
      {pendingRequests.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">
            Solicitudes Pendientes ({pendingRequests.length})
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <MaintenanceRequestCard
                key={request.id}
                request={request}
                hotelId={user?.hotelId}
                staff={maintenanceStaff}
                onAssign={convertRequestToMaintenance}
              />
            ))}
          </div>
        </Card>
      )}
      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="list">Lista de Mantenimientos</TabsTrigger>
          <TabsTrigger value="staff">Rendimiento del Personal</TabsTrigger>
        </TabsList>

        {/* Contenido de las tabs */}
        <TabsContent value="overview" className="space-y-6">
          <MaintenanceStats
            maintenanceList={maintenanceList}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="list">
          <MaintenanceList
            maintenanceList={maintenanceList.filter((m) => {
              const locationMatch = m.location
                ? m.location.toLowerCase().includes(searchTerm.toLowerCase())
                : false;
              const descriptionMatch = m.description
                ? m.description.toLowerCase().includes(searchTerm.toLowerCase())
                : false;
              return locationMatch || descriptionMatch;
            })}
            maintenanceStaff={maintenanceStaff}
            onRefresh={fetchMaintenanceData}
            hotelId={user?.hotelId}
          />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          {maintenanceStaff.map((staff) => {
            // Filtrar los mantenimientos asignados a este miembro del personal
            const staffTasks = maintenanceList.filter(
              (task) => task.assignedTo === staff.id
            );

            return (
              <Card key={staff.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      {staff.name}
                      {staff.pin && (
                        <Badge variant="outline" className="text-xs">
                          PIN: {staff.pin}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{staff.email}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyAccessLink(staff)}
                          className="flex items-center gap-2"
                        >
                          {copiedStaffId === staff.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                          Copiar enlace de acceso
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copiar enlace para acceso del personal</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <StaffEfficiencyView staffMember={staff} tasks={staffTasks} />
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Diálogo para nuevo mantenimiento */}
      {showAddDialog && (
        <MaintenanceFormDialog
          hotelId={user?.hotelId || ""}
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            fetchMaintenanceData();
          }}
        />
      )}
    </div>
  );
};

export default MaintenancePage;
