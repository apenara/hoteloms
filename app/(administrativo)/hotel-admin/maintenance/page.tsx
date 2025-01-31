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
  DocumentData,
  Timestamp
} from "firebase/firestore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, Badge, Check, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceFormDialog from "@/components/maintenance/MaintenanceFormDialog";
import MaintenanceStats from "@/components/maintenance/MaintenanceStats";
import StaffEfficiencyView from "@/components/maintenance/StaffEfficiencyView";
import { Maintenance, User, Staff } from "@/app/lib/types";
import MaintenanceList from "@/app/components/maintenance/MaintenanceList";
import { toast } from "@/app/hooks/use-toast";

interface MaintenanceStaff extends Staff {
  stats?: {
    completed: number;
    total: number;
    efficiency: number;
    avgTime: number;
  };
  tasks?: Maintenance[];
}

const MaintenancePage = () => {
  const { user } = useAuth() as { user: User | null };
  const [maintenanceList, setMaintenanceList] = useState<Maintenance[]>([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState<MaintenanceStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStaff, setSelectedStaff] = useState<MaintenanceStaff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedStaffId, setCopiedStaffId] = useState(null);

  
//creamos link para enviar a la vista de mantenimiento
  const handleCopyAccessLink = (staffMember) => {
    const baseUrl = window.location.origin;
    const accessLink = `${baseUrl}/maintenance/${user.hotelId}/login`;
    
    navigator.clipboard.writeText(accessLink).then(() => {
      setCopiedStaffId(staffMember.id);
      toast({
        title: "Enlace copiado",
        description: "Enlace de acceso copiado al portapapeles",
      });
      
      // Resetear el ícono después de 2 segundos
      setTimeout(() => {
        setCopiedStaffId(null);
      }, 2000);
    });
  };

  // Función para cargar datos de mantenimiento
  const fetchMaintenanceData = async () => {
    try {
      if (!user?.hotelId) return;
      setLoading(true);
      
      // 1. Obtener todas las tareas de mantenimiento
      const maintenanceRef = collection(db, "hotels", user.hotelId, "maintenance");
      const maintenanceSnap = await getDocs(query(maintenanceRef, orderBy("createdAt", "desc")));
      const maintenanceData = maintenanceSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Maintenance[];

      setMaintenanceList(maintenanceData);

      // 2. Obtener personal de mantenimiento
      const staffRef = collection(db, "hotels", user.hotelId, "staff");
      const staffQuery = query(staffRef, where("role", "==", "maintenance"));
      const staffSnap = await getDocs(staffQuery);
      
      // 3. Procesar datos del personal y sus estadísticas
      const staffData = await Promise.all(staffSnap.docs.map(async (doc) => {
        const staffMember = { id: doc.id, ...doc.data() } as MaintenanceStaff;
        const staffTasks = maintenanceData.filter(m => m.assignedTo === doc.id);
        
        // Calcular estadísticas
        const completed = staffTasks.filter(t => t.status === 'completed');
        const efficiency = staffTasks.length ? (completed.length / staffTasks.length) * 100 : 0;
        
        // Calcular tiempo promedio
        let totalTime = 0;
        completed.forEach(task => {
          if (task.completedAt && task.createdAt) {
            totalTime += (task.completedAt.seconds - task.createdAt.seconds) / 3600;
          }
        });
        const avgTime = completed.length ? totalTime / completed.length : 0;

        return {
          ...staffMember,
          stats: {
            completed: completed.length,
            total: staffTasks.length,
            efficiency,
            avgTime
          },
          tasks: staffTasks
        };
      }));

      setMaintenanceStaff(staffData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setError("Error al cargar la información de mantenimiento");
    } finally {
      setLoading(false);
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
      {/* Cabecera con búsqueda y botón de nuevo */}
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
            maintenanceList={maintenanceList.filter(m => 
              m.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.description.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            maintenanceStaff={maintenanceStaff}
            onRefresh={fetchMaintenanceData}
            hotelId={user?.hotelId}
          />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          {maintenanceStaff.map((staff) => (
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
              <StaffEfficiencyView 
                staffMember={staff}
                tasks={staff.tasks || []}
              />
            </Card>
          ))}
        </TabsContent>
      
      </Tabs>

      {/* Diálogo para nuevo mantenimiento */}
      {showAddDialog && (
        <MaintenanceFormDialog
          hotelId={user?.hotelId || ''}
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