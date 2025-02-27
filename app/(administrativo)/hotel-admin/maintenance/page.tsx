//Pagina Administrativa de Mantenimiento
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
import { MaintenanceItem, Staff, Request } from "@/app/lib/types";

/**
 * @function MaintenancePage
 * @description Main component for the Maintenance section of the hotel management application.
 * This component displays an overview of maintenance tasks, pending requests, and staff performance.
 * It allows users to search for maintenance tasks, create new maintenance requests, and view detailed information.
 * @returns {JSX.Element} The rendered MaintenancePage component.
 */
const MaintenancePage = () => {
  // Hooks
  const { user } = useAuth(); // Custom hook for user authentication
  // State variables
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]); // List of all maintenance tasks and requests
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]); // List of pending maintenance requests
  const [maintenanceStaff, setMaintenanceStaff] = useState<Staff[]>([]); // List of maintenance staff members
  const [loading, setLoading] = useState<boolean>(true); // Loading state for data fetching
  const [searchTerm, setSearchTerm] = useState<string>(""); // Search term for filtering maintenance tasks
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false); // State to control the visibility of the add maintenance dialog
  const [activeTab, setActiveTab] = useState<string>("overview"); // State for the currently active tab
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null); // Currently selected staff member (might be unused)
  const [error, setError] = useState<string | null>(null); // State for any error messages
  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null); // State to track copied staff id

  /**
   * @function fetchMaintenanceData
   * @description Fetches maintenance data, pending requests, and maintenance staff from Firestore.
   * It updates the state variables with the fetched data or sets an error message if something fails.
   * @async
   * @returns {Promise<void>}
   */
  const fetchMaintenanceData = async () => {
    try {
      if (!user?.hotelId) return; // Exit if hotelId is not available
      setLoading(true);

      // 1. Fetch pending maintenance requests
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
        isRequest: true, // Indicates that this item is a request
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(), // Convert Timestamp to Date
      })) as Request[];
      setPendingRequests(requestsData);

      // 2. Fetch existing maintenance tasks
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
      })) as MaintenanceItem[];

      // Combine requests and maintenance tasks for the overall list
      setMaintenanceList([...requestsData, ...maintenanceData]);

      // 3. Fetch maintenance staff
      const staffRef = collection(db, "hotels", user.hotelId, "staff");
      const staffQuery = query(staffRef, where("role", "==", "maintenance"));
      const staffSnap = await getDocs(staffQuery);
      const staffData = staffSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Staff[];
      setMaintenanceStaff(staffData);
    } catch (error) {
      console.error("Error:", error);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @function convertRequestToMaintenance
   * @description Converts a maintenance request into a maintenance task.
   * It moves the request from the 'requests' collection to the 'maintenance' collection,
   * updates the request's status to 'in_progress', and assigns it to a staff member.
   * @async
   * @param {Request} request - The maintenance request to convert.
   * @param {string} staffId - The ID of the staff member to assign the task to.
   * @param {string} scheduledDate - The date the task is scheduled for.
   * @returns {Promise<void>}
   */
  const convertRequestToMaintenance = async (
    request: Request,
    staffId: string,
    scheduledDate: string
  ) => {
    try {
      const maintenanceRef = collection(
        db,
        "hotels",
        user.hotelId,
        "maintenance"
      );

      // Create a new maintenance task based on the request
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
        images: request.images || [], // Include images if available
      });

      // Update the request status to 'in_progress'
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

      // Refresh maintenance data
      await fetchMaintenanceData();

      // Success message
      toast({
        title: "Solicitud asignada",
        description: "Se ha creado el mantenimiento correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      // Error message
      toast({
        title: "Error",
        description: "No se pudo asignar la solicitud",
        variant: "destructive",
      });
    }
  };

  /**
   * @function handleCopyAccessLink
   * @description Handle the copy of the access link of a staff member
   * @param {Staff} staff - The staff object
   * @returns {void}
   */
  const handleCopyAccessLink = (staff: Staff) => {
    if (!staff.pin) {
      toast({
        title: "Error",
        description: "Este usuario no tiene un PIN asignado.",
        variant: "destructive",
      });
      return;
    }
    const staffLink = `${window.location.origin}/staff/${staff.pin}`; // Generar el enlace de acceso para el staff
    navigator.clipboard.writeText(staffLink); // Copiar el enlace en el portapapeles
    setCopiedStaffId(staff.id); // Marcar que el ID ha sido copiado.
    toast({
      title: "Enlace copiado",
      description: "El enlace de acceso se ha copiado al portapapeles.",
    });
  };

  // Fetch data on component mount and when user changes
  useEffect(() => {
    if (user?.hotelId) {
      fetchMaintenanceData();
    }
  }, [user]);

  // Display loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Main component render
  return (
    <div className="p-6 space-y-6">
      {/* Header and existing components */}
      <div className="flex justify-between items-center">
        {/* Search Bar */}
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar mantenimientos..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Add New Maintenance Button */}
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Mantenimiento
        </Button>
      </div>

      {/* Display pending requests if there are any */}
      {pendingRequests.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">
            Solicitudes Pendientes ({pendingRequests.length})
          </h3>
          <div className="space-y-4">
            {/* Render each pending request as a card */}
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
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tab List */}
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="list">Lista de Mantenimientos</TabsTrigger>
          <TabsTrigger value="staff">Rendimiento del Personal</TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview" className="space-y-6">
          {/* Maintenance Overview Stats */}
          <MaintenanceStats
            maintenanceList={maintenanceList}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="list">
          {/* Filtered Maintenance List */}
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
          {/* Maintenance Staff Performance View */}
          {maintenanceStaff.map((staff) => {
            // Filter tasks assigned to this staff member
            const staffTasks = maintenanceList.filter(
              (task) => task.assignedTo === staff.id
            );

            return (
              <Card key={staff.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      {staff.name}
                      {/* Display PIN if available */}
                      {staff.pin && (
                        <Badge variant="outline" className="text-xs">
                          PIN: {staff.pin}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{staff.email}</p>
                  </div>
                  {/* Copy Access Link Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyAccessLink(staff)}
                          className="flex items-center gap-2"
                        >
                          {/* Display check icon if link is copied */}
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
                {/* Staff Efficiency View */}
                <StaffEfficiencyView staffMember={staff} tasks={staffTasks} />
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* New Maintenance Dialog */}
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
