"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";

interface NotificationConfig {
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  recipientRoles: string[];
}

interface NotificationSettings {
  roomStateChanges: NotificationConfig;
  maintenanceRequests: NotificationConfig;
  checkInReminders: NotificationConfig;
  checkOutReminders: NotificationConfig;
  guestRequests: NotificationConfig;
  inventoryAlerts: NotificationConfig;
  dailyAssignments: NotificationConfig;
  performanceReports: NotificationConfig;
}

const roleOptions = [
  { id: "manager", label: "Gerente" },
  { id: "receptionist", label: "Recepcionista" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "maintenance", label: "Mantenimiento" },
  { id: "admin", label: "Administrador" },
];

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    roomStateChanges: {
      enabled: true,
      channels: { email: true, push: true, sms: false },
      recipientRoles: ["manager", "receptionist", "housekeeping"],
    },
    maintenanceRequests: {
      enabled: true,
      channels: { email: true, push: true, sms: false },
      recipientRoles: ["manager", "maintenance"],
    },
    checkInReminders: {
      enabled: true,
      channels: { email: true, push: true, sms: false },
      recipientRoles: ["manager", "receptionist"],
    },
    checkOutReminders: {
      enabled: true,
      channels: { email: true, push: true, sms: false },
      recipientRoles: ["manager", "receptionist", "housekeeping"],
    },
    guestRequests: {
      enabled: true,
      channels: { email: false, push: true, sms: false },
      recipientRoles: ["receptionist"],
    },
    inventoryAlerts: {
      enabled: true,
      channels: { email: true, push: false, sms: false },
      recipientRoles: ["manager", "housekeeping"],
    },
    dailyAssignments: {
      enabled: true,
      channels: { email: true, push: true, sms: false },
      recipientRoles: ["manager", "housekeeping"],
    },
    performanceReports: {
      enabled: true,
      channels: { email: true, push: false, sms: false },
      recipientRoles: ["manager", "admin"],
    },
  });
  const [saving, setSaving] = useState(false);
  
  // Hardcoded for demo - would normally get from authentication context
  const hotelId = "current-hotel-id";

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const hotelDoc = await getDoc(doc(db, "hotels", hotelId));
        if (hotelDoc.exists()) {
          const data = hotelDoc.data();
          if (data.notificationSettings) {
            setSettings(data.notificationSettings);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching notification settings:", err);
        setError("Error al cargar la configuración de notificaciones");
        setLoading(false);
      }
    };

    fetchNotificationSettings();
  }, [hotelId]);

  const handleToggleNotificationType = (type: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled,
      },
    }));
  };

  const handleToggleChannel = (type: keyof NotificationSettings, channel: keyof NotificationConfig["channels"]) => {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        channels: {
          ...prev[type].channels,
          [channel]: !prev[type].channels[channel],
        },
      },
    }));
  };

  const handleToggleRole = (type: keyof NotificationSettings, roleId: string) => {
    setSettings((prev) => {
      const currentRoles = prev[type].recipientRoles;
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter((id) => id !== roleId)
        : [...currentRoles, roleId];
      
      return {
        ...prev,
        [type]: {
          ...prev[type],
          recipientRoles: newRoles,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateDoc(doc(db, "hotels", hotelId), {
        notificationSettings: settings,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Configuración actualizada",
        description: "Las notificaciones han sido configuradas correctamente",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating notification settings:", err);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de notificaciones",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView message="Cargando configuración de notificaciones..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Configuración de Notificaciones</h2>
        <p className="text-sm text-gray-500">
          Personaliza las notificaciones para cada tipo de evento
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {(Object.keys(settings) as Array<keyof NotificationSettings>).map((type) => {
          const config = settings[type];
          const typeName = 
            type === "roomStateChanges" ? "Cambios de Estado de Habitaciones" :
            type === "maintenanceRequests" ? "Solicitudes de Mantenimiento" :
            type === "checkInReminders" ? "Recordatorios de Check-in" :
            type === "checkOutReminders" ? "Recordatorios de Check-out" :
            type === "guestRequests" ? "Solicitudes de Huéspedes" :
            type === "inventoryAlerts" ? "Alertas de Inventario" :
            type === "dailyAssignments" ? "Asignaciones Diarias" :
            type === "performanceReports" ? "Reportes de Desempeño" : 
            type;
          
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center text-lg">
                  <span>{typeName}</span>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`toggle-${type}`} className="text-sm font-normal text-gray-500">
                      {config.enabled ? "Habilitado" : "Deshabilitado"}
                    </Label>
                    <Switch
                      id={`toggle-${type}`}
                      checked={config.enabled}
                      onCheckedChange={() => handleToggleNotificationType(type)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Canales de Notificación</h4>
                    <div className="flex space-x-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${type}-email`}
                          checked={config.channels.email}
                          onCheckedChange={() => handleToggleChannel(type, "email")}
                          disabled={!config.enabled}
                        />
                        <Label
                          htmlFor={`${type}-email`}
                          className={!config.enabled ? "text-gray-400" : ""}
                        >
                          Email
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${type}-push`}
                          checked={config.channels.push}
                          onCheckedChange={() => handleToggleChannel(type, "push")}
                          disabled={!config.enabled}
                        />
                        <Label
                          htmlFor={`${type}-push`}
                          className={!config.enabled ? "text-gray-400" : ""}
                        >
                          Notificaciones Push
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${type}-sms`}
                          checked={config.channels.sms}
                          onCheckedChange={() => handleToggleChannel(type, "sms")}
                          disabled={!config.enabled}
                        />
                        <Label
                          htmlFor={`${type}-sms`}
                          className={!config.enabled ? "text-gray-400" : ""}
                        >
                          SMS
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Destinatarios</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {roleOptions.map((role) => (
                        <div key={role.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${type}-${role.id}`}
                            checked={config.recipientRoles.includes(role.id)}
                            onCheckedChange={() => handleToggleRole(type, role.id)}
                            disabled={!config.enabled}
                          />
                          <Label
                            htmlFor={`${type}-${role.id}`}
                            className={!config.enabled ? "text-gray-400" : ""}
                          >
                            {role.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </form>
    </div>
  );
}