// src/app/(superAdm)/admin/users/page.tsx
// aqui se deben de agregar las pestañas para la administración de usuarios
// creacion de usuarios, edicion de usuarios, eliminacion de usuarios, etc.

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * @function UsersPage
 * @description This component renders the Users management page in the Super Admin dashboard.
 * It displays a tabbed interface for managing different aspects of system users.
 * Currently, the tabs for 'Hotel', 'Habitaciones', 'Notificaciones', and 'Integraciones' are placeholders,
 * and their functionality is yet to be implemented.
 * @returns {JSX.Element} The rendered UsersPage component.
 */
export default function UsersPage() {
  /**
   * @description Main component render.
   * Renders the tabbed interface for managing users.
   */
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          {/* Card Title */}
          <CardTitle className="text-2xl font-bold">
            Usuarios del sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs defaultValue="hotel">
            <TabsList>
              {/* Hotel Tab */}
              <TabsTrigger value="hotel">Hotel</TabsTrigger>
              {/* Rooms Tab */}
              <TabsTrigger value="rooms">Habitaciones</TabsTrigger>
              {/* Notifications Tab */}
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
              {/* Integrations Tab */}
              <TabsTrigger value="integrations">Integraciones</TabsTrigger>
            </TabsList>

            {/* Hotel Tab Content */}
            <TabsContent value="hotel">
              {/* Configuración general del hotel */}
            </TabsContent>

            {/* Rooms Tab Content */}
            <TabsContent value="rooms">
              {/* Configuración de habitaciones */}
            </TabsContent>

            {/* Notifications Tab Content */}
            <TabsContent value="notifications">
              {/* Configuración de notificaciones */}
            </TabsContent>

            {/* Integrations Tab Content */}
            <TabsContent value="integrations">
              {/* Integraciones con otros servicios */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
