// src/app/(hotel-admin)/settings/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Usuarios del sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hotel">
            <TabsList>
              <TabsTrigger value="hotel">Hotel</TabsTrigger>
              <TabsTrigger value="rooms">Habitaciones</TabsTrigger>
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
              <TabsTrigger value="integrations">Integraciones</TabsTrigger>
            </TabsList>

            <TabsContent value="hotel">
              {/* Configuración general del hotel */}
            </TabsContent>

            <TabsContent value="rooms">
              {/* Configuración de habitaciones */}
            </TabsContent>

            <TabsContent value="notifications">
              {/* Configuración de notificaciones */}
            </TabsContent>

            <TabsContent value="integrations">
              {/* Integraciones con otros servicios */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
