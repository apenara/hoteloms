//Pagina administrativa de housekeeping
"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, BarChart3, History, ClipboardList } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HousekeepingStaffList } from "@/components/housekeeping/HousekeepingStaffList";
import { HousekeepingStats } from "@/components/housekeeping/HousekeepingStats";
import { HousekeepingHistory } from "@/components/housekeeping/HousekeepingHistory";
import { HousekeepingMetrics } from "@/components/housekeeping/HousekeepingMetrics";
import { useRealTimeHousekeeping } from "@/app/hooks/useRealTimeHousekeeping";
import { User } from "@/app/lib/types";
import { EstadisticasGlobales } from "@/app/lib/types/housekeeping";

/**
 * @interface HousekeepingStats
 * @description Defines the props required by the HousekeepingStats component.
 * @property {EstadisticasGlobales} estadisticasGlobales - Global housekeeping statistics.
 * @property {Date} selectedDate - The currently selected date for filtering data.
 * @property {(date: Date) => void} onDateChange - Function to handle date changes.
 */
interface HousekeepingStatsProps {
  estadisticasGlobales: EstadisticasGlobales;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

/**
 * @constant TABS
 * @description Defines the structure of the tabs in the Housekeeping page.
 * Each tab has an id, label, icon, and the component to render when the tab is active.
 */
const TABS = [
  {
    id: "personal",
    label: "Personal",
    icon: Users,
    component: HousekeepingStaffList,
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    icon: BarChart3,
    component: HousekeepingStats,
  },
  {
    id: "historial",
    label: "Historial",
    icon: History,
    component: HousekeepingHistory,
  },
  {
    id: "metricas",
    label: "Métricas",
    icon: ClipboardList,
    component: HousekeepingMetrics,
  },
];

/**
 * @function HousekeepingPage
 * @description Main component for the Housekeeping section of the hotel management application.
 * It displays a dashboard with various tabs for managing staff, viewing statistics, history, and metrics.
 * @returns {JSX.Element} The rendered HousekeepingPage component.
 */
export default function HousekeepingPage() {
  // Hooks for authentication and state management
  const { user } = useAuth() as { user: User | null }; // Custom hook to get the current user
  const [activeTab, setActiveTab] = useState("personal"); // State to track the currently active tab
  const [searchTerm, setSearchTerm] = useState(""); // State for the search input value
  const [selectedDate, setSelectedDate] = useState(new Date()); // State for the selected date (default to today)

  /**
   * @hook useRealTimeHousekeeping
   * @description Custom hook to fetch real-time data about housekeeping from Firebase.
   * @param {Object} params - Object containing the parameters for the hook.
   * @param {string} params.hotelId - The ID of the current hotel.
   * @param {Date} params.selectedDate - The date selected for filtering the data.
   * @returns {Object} An object containing the following data:
   * @property {Array} camareras - List of all active housekeepers.
   * @property {Array} habitaciones - List of all rooms with their current status.
   * @property {EstadisticasGlobales} estadisticasGlobales - Global statistics for housekeeping.
   * @property {boolean} loading - Indicates whether data is currently being loaded.
   * @property {string | null} error - Contains any error message that occurred while loading data.
   */
  const { camareras, habitaciones, estadisticasGlobales, loading, error } =
    useRealTimeHousekeeping({
      hotelId: user?.hotelId || "",
      selectedDate,
    });

  /**
   * @hook useMemo
   * @description Memoized calculation of rooms that are pending cleaning.
   * @returns {Array} An array of rooms that are pending cleaning.
   */
  const habitacionesPendientes = useMemo(
    () =>
      habitaciones.filter(
        (h) => !h.assignedTo && ["need_cleaning", "checkout"].includes(h.status)
      ),
    [habitaciones]
  );

  /**
   * @hook useMemo
   * @description Memoized calculation of housekeepers currently working.
   * @returns {Array} An array of housekeepers who are currently assigned to rooms.
   */
  const camareraTrabajando = useMemo(
    () =>
      camareras.filter((c) => habitaciones.some((h) => h.assignedTo === c.id)),
    [camareras, habitaciones]
  );

  // Loading and Error States
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main Component Render
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">
              Panel de Housekeeping
            </CardTitle>
            {/* Badges showing the number of active and working housekeepers */}
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg">
                {camareras.length} Camareras Activas
              </Badge>
              <Badge variant="outline" className="text-lg">
                {camareraTrabajando.length} En Servicio
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats Cards - Cards showing general stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                {/* Pending Rooms */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Pendientes</span>
                  <Badge variant="outline">
                    {habitacionesPendientes.length}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {habitacionesPendientes.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {/* Rooms being cleaned */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">En Limpieza</span>
                  <Badge variant="outline">
                    {
                      habitaciones.filter((h) =>
                        [
                          "cleaning_occupied",
                          "cleaning_checkout",
                          "cleaning_touch",
                        ].includes(h.status)
                      ).length
                    }
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {
                    habitaciones.filter((h) =>
                      [
                        "cleaning_occupied",
                        "cleaning_checkout",
                        "cleaning_touch",
                      ].includes(h.status)
                    ).length
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {/* Rooms completed today */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Completadas Hoy</span>
                  <Badge variant="outline">
                    {estadisticasGlobales.completadas}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {estadisticasGlobales.completadas}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {/* Overall efficiency */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Eficiencia Global</span>
                  <Badge variant="outline">
                    {Math.round(estadisticasGlobales.eficienciaGlobal)}%
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(estadisticasGlobales.eficienciaGlobal)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert for pending rooms */}
          {habitacionesPendientes.length > 0 && (
            <Alert className="mb-6">
              <AlertDescription>
                Hay {habitacionesPendientes.length} habitaciones pendientes de
                asignar
              </AlertDescription>
            </Alert>
          )}

          {/* Search bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab content rendering */}
            {TABS.map((tab) => {
              const TabComponent = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id}>
                  <TabComponent
                    camareras={camareras}
                    habitaciones={habitaciones}
                    estadisticasGlobales={estadisticasGlobales}
                    searchTerm={searchTerm}
                    // selectedDate={selectedDate} ----- pendiente por corregir no me dedique a indagat mas por que estaba cansado
                    // onDateChange={setSelectedDate}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
