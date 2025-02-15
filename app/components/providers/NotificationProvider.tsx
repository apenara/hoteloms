// src/components/providers/NotificationProvider.tsx
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/app/hooks/use-toast';
import { useNotificationSubscription } from '@/app/hooks/useNotificationSubscription';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notificationsEnabled, requestPermission } = useNotificationSubscription();

  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones push');
      return;
    }

    // Verificar si ya tenemos permiso
    if (Notification.permission === 'granted') {
      return;
    }

    // Si aún no se ha pedido permiso, mostrar toast
    if (Notification.permission === 'default' && user) {
      toast({
        title: 'Notificaciones',
        description: '¿Deseas recibir notificaciones de actualizaciones importantes?',
        action: (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={requestPermission}
          >
            <Bell className="h-4 w-4" />
            Activar
          </Button>
        ),
        duration: 10000,
      });
    }
  }, [user]);

  return <>{children}</>;
}