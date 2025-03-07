"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import HotelInfoSettings from "@/components/settings/HotelInfoSettings";
import CleaningStandardsSettings from "@/components/settings/CleaningStandardsSettings";
import BrandingSettings from "@/components/settings/BrandingSettings";
import BillingHistory from "@/components/settings/BillingHistory";
import RoomTypesSettings from "@/components/settings/RoomTypesSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("hotel-info");

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configuración del Hotel</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 mb-8">
          <TabsTrigger value="hotel-info">Información</TabsTrigger>
          <TabsTrigger value="cleaning-standards">Estándares</TabsTrigger>
          <TabsTrigger value="branding">Marca</TabsTrigger>
          <TabsTrigger value="room-types">Tipos de Habitación</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>
        
        <Card className="p-6">
          <TabsContent value="hotel-info">
            <HotelInfoSettings />
          </TabsContent>
          
          <TabsContent value="cleaning-standards">
            <CleaningStandardsSettings />
          </TabsContent>
          
          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>
          
          <TabsContent value="room-types">
            <RoomTypesSettings />
          </TabsContent>
          
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
          
          <TabsContent value="billing">
            <BillingHistory />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
