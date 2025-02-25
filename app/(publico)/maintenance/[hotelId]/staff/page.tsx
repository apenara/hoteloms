// Esta es la página principal para el personal de mantenimiento de un hotel específico.
// Se encarga de la autenticación, la obtención de datos y muestra una vista específica para el personal de mantenimiento.
// aqui se ven todas las actividades y soliciutdes de mantenimiento que se han hecho en el hotel
// Se muestra un mensaje de bienvenida y un botón para cerrar sesión.

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import MaintenanceStaffView from '@/components/maintenance/MaintenanceStaffView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Staff, Hotel } from '@/app/lib/types';

/**
 * @interface MaintenanceStaffPageProps
 * @description Defines the props for the MaintenanceStaffPage component.
 * @property {string} params - The parameters passed to the page.
 */
interface MaintenanceStaffPageProps {
  params: {
    hotelId: string;
  };
}

/**
 * @function MaintenanceStaffPage
 * @description This component represents the main page for maintenance staff to view and manage their tasks within a specific hotel.
 * It handles authentication, data fetching, and displays a view specific to maintenance staff.
 * @returns {JSX.Element} The rendered MaintenanceStaffPage component.
 */
export default function MaintenanceStaffPage() {
  // Hooks
  const router = useRouter(); // Next.js router for navigation
  const params = useParams<MaintenanceStaffPageProps["params"]>(); // Next.js hook to get the URL parameters
  const { staff, signOut } = useAuth() as {staff: Staff | null, signOut: () => void}; // Custom hook for authentication

  // State variables
  const [hotel, setHotel] = useState<Hotel | null>(null); // State to store the hotel information
  const [loading, setLoading] = useState<boolean>(true); // Loading state for data fetching
  const [error, setError] = useState<string | null>(null); // State for any error messages

  /**
   * @function fetchData
   * @description Fetches hotel data from Firestore.
   * It verifies the staff's access to the specified hotel and retrieves the hotel's information.
   * Sets an error message if something fails.
   * @async
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const fetchData = async () => {
      // Guard clause: Check if the hotelId parameter exists
      if (!params?.hotelId) {
        setError('Hotel no especificado');
        setLoading(false);
        return;
      }

      try {
        // Guard clause: Verify if the staff member belongs to the specified hotel
        if (staff && staff.hotelId !== params.hotelId) {
          setError('No tienes acceso a este hotel');
          setLoading(false);
          return;
        }

        // Fetch the hotel document from Firestore
        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (!hotelDoc.exists()) {
          setError('Hotel no encontrado');
          setLoading(false);
          return;
        }

        // Set the hotel information in the state
        setHotel({ id: hotelDoc.id, ...hotelDoc.data() } as Hotel);
      } catch (error) {
        console.error('Error:', error);
        setError('Error al cargar la información');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Dependencies: params?.hotelId, staff
  }, [params?.hotelId, staff]);

  /**
   * @useEffect
   * @description This effect is responsible for redirecting the staff member if they are not authenticated or do not have the correct role.
   * If the staff member is not authenticated, it redirects them to the login page.
   * If the staff member is authenticated but does not have the 'maintenance' role, it sets an error.
   * @dependency staff - Changes when the staff authentication status changes
   * @dependency loading - Changes when the loading state changes
   * @dependency router - Changes when the router object changes
   * @dependency params?.hotelId - Changes when the params object changes
   */
  useEffect(() => {
    if (!loading && !staff) {
      router.push(`/maintenance/${params.hotelId}/login`);
    } else if (!loading && staff?.role !== 'maintenance') {
      setError('No tienes permisos de mantenimiento');
    }
    // Dependencies: staff, loading, router, params?.hotelId
  }, [staff, loading, router, params?.hotelId]);

  // Display loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Display error message
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              {/* Hotel Name */}
              <h1 className="text-lg font-medium">
                {hotel?.name || 'Panel de Mantenimiento'}
              </h1>
              {/* Welcome message for the staff */}
              <p className="text-sm text-gray-500">
                Bienvenido, {staff?.name}
              </p>
            </div>
            {/* Logout Button */}
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                router.push(`/maintenance/${params.hotelId}/login`);
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Maintenance Staff View Component */}
        <MaintenanceStaffView hotelId={params.hotelId} />
      </main>
    </div>
  );
}
