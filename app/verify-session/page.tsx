"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function VerifySession() {
  const router = useRouter();
  const { user, staff, loading } = useAuth();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (loading) return; // Esperar a que termine la carga de auth

    const redirectBasedOnAuth = () => {
      console.log("Verificando sesión:", { user, staff });

      // Si hay un usuario o staff autenticado
      if (user || staff) {
        // Redirigir según el rol
        if (user) {
          if (user.role === 'super_admin') {
            router.replace('/admin/dashboard');
          } else if (user.role === 'hotel_admin') {
            router.replace('/hotel-admin/dashboard');
          } else {
            router.replace('/dashboard');
          }
        } else if (staff) {
          // Redirigir según el rol del staff
          if (staff.role === 'reception') {
            router.replace(`/reception/${staff.hotelId}/staff`);
          } else if (staff.role === 'maintenance') {
            router.replace(`/maintenance/${staff.hotelId}/staff`);
          } else if (staff.role === 'housekeeper') {
            router.replace(`/housekeeping/${staff.hotelId}/staff`);
          } else {
            // Rol no específico
            router.replace(`/dashboard`);
          }
        }
      } else {
        // Si no hay sesión, redirigir al login
        router.replace('/auth/login');
      }
    };

    const timeoutId = setTimeout(() => {
      redirectBasedOnAuth();
      setVerifying(false);
    }, 500); // Pequeño delay para evitar parpadeos

    return () => clearTimeout(timeoutId);
  }, [user, staff, loading, router]);

  // Mostrar un indicador de carga mientras se verifica la sesión
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {verifying && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
      )}
    </div>
  );
}