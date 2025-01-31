'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Key } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function MaintenanceLoginPage() {
  const router = useRouter();
  const params = useParams();
  const { loginWithPin, staff } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hotel, setHotel] = useState(null);

  // Cargar información del hotel
  useEffect(() => {
    const fetchHotelInfo = async () => {
      if (!params?.hotelId) {
        setError('Código de hotel no proporcionado');
        return;
      }

      try {
        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (!hotelDoc.exists()) {
          setError('Hotel no encontrado');
          return;
        }
        setHotel({ id: hotelDoc.id, ...hotelDoc.data() });
      } catch (error) {
        console.error('Error al cargar hotel:', error);
        setError('Error al cargar información del hotel');
      }
    };

    fetchHotelInfo();
  }, [params?.hotelId]);

  // Si ya está autenticado, redirigir a la vista de mantenimiento
  useEffect(() => {
    if (staff?.role === 'maintenance') {
      router.push(`/maintenance/${params.hotelId}/staff`);
    }
  }, [staff, router, params?.hotelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !params?.hotelId) {
      setError('Por favor ingresa tu PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginWithPin(pin, params.hotelId);
      router.push(`/maintenance/${params.hotelId}/staff`);
    } catch (error) {
      console.error('Error de autenticación:', error);
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="text-center">Cargando información del hotel...</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            {hotel.name || 'Acceso Mantenimiento'}
          </CardTitle>
          <CardDescription>
            Ingresa con tu PIN de personal de mantenimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">PIN de Acceso</label>
              <div className="relative">
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Ingresa tu PIN"
                  maxLength={10}
                  disabled={loading}
                  className="pl-10 text-center tracking-widest text-lg"
                />
                <Key className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                Ingresa tu número de documento como PIN
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || !pin.trim()}
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}