// src/app/hotel-admin/housekeeping/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, BarChart3, History, ClipboardList, CalendarRange, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HousekeepingStaffList } from "@/components/housekeeping/HousekeepingStaffList";
import { HousekeepingStats } from "@/components/housekeeping/HousekeepingStats";
import { HousekeepingHistory } from "@/components/housekeeping/HousekeepingHistory";
import { HousekeepingMetrics } from "@/components/housekeeping/HousekeepingMetrics";
import { DailyAssignmentCreator } from "@/components/housekeeping/DailyAssignmentCreator";
import { ActiveCamareraList } from "@/components/housekeeping/ActiveCamareraList";
import { CamareraMobileView } from "@/components/housekeeping/CamareraMobileView";
import { useRealTimeHousekeeping } from "@/app/hooks/useRealTimeHousekeeping";
import { User as UserType } from "@/app/lib/types";
import { EstadisticasGlobales } from "@/app/lib/types/housekeeping";

interface HousekeepingStatsProps {
  estadisticasGlobales: EstadisticasGlobales;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const TABS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    component: HousekeepingStats,
  },
  {
    id: "assignment",
    label: "Asignación Diaria",
    icon: CalendarRange,
    component: DailyAssignmentCreator,
  },
  {
    id: "active",
    label: "Camareras Activas",
    icon: Users,
    component: ActiveCamareraList,
  },
  {
    id: "personal",
    label: "Personal",
    icon: User,
    component: HousekeepingStaffList,
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

export default function HousekeepingPage() {
  const { user } = useAuth() as { user: UserType | null };
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCamarera, setSelectedCamarera] = useState<string | null>(null);

  const { camareras, habitaciones, estadisticasGlobales, loading, error } =
    useRealTimeHousekeeping({
      hotelId: user?.hotelId || "",
      selectedDate,
    });

  const habitacionesPendientes = useMemo(
    () =>
      habitaciones.filter(
        (h) => !h.assignedTo && ["need_cleaning", "checkout"].includes(h.status)
      ),
    [habitaciones]
  );

  const camareraTrabajando = useMemo(
    () =>
      camareras.filter((c) => habitaciones.some((h) => h.assignedTo === c.id)),
    [camareras, habitaciones]
  );

  // Si hay una camarera seleccionada para el detalle, mostrar su vista
  const selectedCamareraData = useMemo(() => {
    if (!selectedCamarera) return null;
    return camareras.find(c => c.id === selectedCamarera) || null;
  }, [camareras, selectedCamarera]);

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

  // Si hay una camarera seleccionada, mostrar su vista detallada
  if (selectedCamareraData) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <User className="h-6 w-6" />
                {selectedCamareraData.name}
              </CardTitle>
              <button
                className="text-sm text-blue-600"
                onClick={() => setSelectedCamarera(null)}
              >
                ← Volver
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <CamareraMobileView
              camarera={selectedCamareraData}
              habitaciones={habitaciones}
              hotelId={user?.hotelId || ""}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">
              Panel de Housekeeping
            </CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
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

          {habitacionesPendientes.length > 0 && (
            <Alert className="mb-6">
              <AlertDescription>
                Hay {habitacionesPendientes.length} habitaciones pendientes de
                asignar
              </AlertDescription>
            </Alert>
          )}

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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid mb-4" style={{gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))`}}>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[calc(100vh-400px)]">
              {activeTab === "dashboard" && (
                <HousekeepingStats
                  estadisticasGlobales={estadisticasGlobales}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {activeTab === "assignment" && (
                <DailyAssignmentCreator
                  camareras={camareras}
                  habitaciones={habitaciones}
                  hotelId={user?.hotelId || ""}
                />
              )}

              {activeTab === "active" && (
                <ActiveCamareraList
                  camareras={camareras}
                  habitaciones={habitaciones}
                  onSelectCamarera={setSelectedCamarera}
                />
              )}

              {activeTab === "personal" && (
                <HousekeepingStaffList
                  camareras={camareras}
                  habitaciones={habitaciones}
                  searchTerm={searchTerm}
                />
              )}

              {activeTab === "historial" && (
                <HousekeepingHistory
                  camareras={camareras}
                  habitaciones={habitaciones}
                />
              )}

              {activeTab === "metricas" && (
                <HousekeepingMetrics
                  camareras={camareras}
                  habitaciones={habitaciones}
                  estadisticasGlobales={estadisticasGlobales}
                />
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}