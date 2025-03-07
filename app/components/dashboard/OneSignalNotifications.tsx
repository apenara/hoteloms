"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { oneSignalService } from '@/app/services/oneSignalService';
import { useAuth } from '@/lib/auth';
import { BellRing } from 'lucide-react';

// Función para obtener el nombre legible de un rol
const getRoleName = (roleCode: string): string => {
  const roleNames: Record<string, string> = {
    'admin': 'Administrador',
    'manager': 'Gerente',
    'reception': 'Recepcionista',
    'housekeeping': 'Housekeeping',
    'maintenance': 'Mantenimiento',
    'front': 'Front Desk',
    'superadmin': 'Super Administrador'
  };

  return roleNames[roleCode] || roleCode;
};

export default function OneSignalNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, staffMember } = useAuth();
  
  const userId = user?.uid || staffMember?.id;
  const hotelId = user?.hotelId || staffMember?.hotelId;

  useEffect(() => {
    // Verificar el estado actual de las notificaciones cuando el componente se monta
    const checkNotificationStatus = async () => {
      if (typeof window !== 'undefined' && window.OneSignal) {
        const enabled = await oneSignalService.areNotificationsEnabled();
        setNotificationsEnabled(enabled);
      }
    };

    // Esperar a que OneSignal se inicialice
    const checkOneSignal = setInterval(() => {
      if (typeof window !== 'undefined' && window.OneSignal) {
        clearInterval(checkOneSignal);
        checkNotificationStatus();
      }
    }, 1000);

    return () => clearInterval(checkOneSignal);
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      // Solicitar permiso para enviar notificaciones
      const subscriptionId = await oneSignalService.requestPermission();
      
      if (subscriptionId) {
        setNotificationsEnabled(true);
        
        // Si tenemos un userId, vinculamos el dispositivo al usuario
        if (userId) {
          await oneSignalService.setExternalUserId(userId);
        }
        
        // Si tenemos un hotelId, suscribimos al usuario a notificaciones de ese hotel
        if (hotelId) {
          await oneSignalService.subscribeToTopic(`hotel-${hotelId}`);
        }
        
        // Si es personal, suscribir a notificaciones por su rol
        if (staffMember?.role) {
          // Registrar el rol para segmentación
          await oneSignalService.subscribeToTopic(`role-${staffMember.role}`);
          
          // También almacenamos el nombre del rol para mayor claridad
          const roleName = getRoleName(staffMember.role);
          await oneSignalService.setTags({
            'role': staffMember.role,
            'roleName': roleName,
            'isStaff': 'true'
          });
        } else if (user) {
          // Para usuarios comunes (no staff)
          await oneSignalService.setTags({
            'isStaff': 'false',
            'isGuest': 'true'
          });
        }
      } else {
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // No mostrar nada mientras se verifica el estado
  if (notificationsEnabled === null) return null;
  
  // Si las notificaciones ya están habilitadas, mostrar mensaje de éxito
  if (notificationsEnabled) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
        <div className="flex items-center text-green-700">
          <BellRing className="h-4 w-4 mr-2" />
          <p className="text-sm">Notificaciones activadas correctamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            Recibe notificaciones importantes
          </p>
          <p className="text-xs text-gray-500">
            Mantente al día con actualizaciones en tiempo real.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleRequestPermission}
          disabled={isLoading}
        >
          {isLoading ? "Procesando..." : "Activar"}
        </Button>
      </div>
    </div>
  );
}