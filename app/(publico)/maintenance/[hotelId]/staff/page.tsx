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

export default function MaintenanceStaffPage() {
  const router = useRouter();
  const params = useParams();
  const { staff, signOut } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.hotelId) {
        setError('Hotel no especificado');
        setLoading(false);
        return;
      }

      try {
        // Verificar que el usuario pertenece a este hotel
        if (staff && staff.hotelId !== params.hotelId) {
          setError('No tienes acceso a este hotel');
          setLoading(false);
          return;
        }

        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (!hotelDoc.exists()) {
          setError('Hotel no encontrado');
          setLoading(false);
          return;
        }

        setHotel({ id: hotelDoc.id, ...hotelDoc.data() });
      } catch (error) {
        console.error('Error:', error);
        setError('Error al cargar la información');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params?.hotelId, staff]);

  useEffect(() => {
    if (!loading && !staff) {
      router.push(`/maintenance/${params.hotelId}/login`);
    } else if (!loading && staff?.role !== 'maintenance') {
      setError('No tienes permisos de mantenimiento');
    }
  }, [staff, loading, router, params?.hotelId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-lg font-medium">
                {hotel?.name || 'Panel de Mantenimiento'}
              </h1>
              <p className="text-sm text-gray-500">
                Bienvenido, {staff?.name}
              </p>
            </div>
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <MaintenanceStaffView hotelId={params.hotelId} />
      </main>
    </div>
  );
}