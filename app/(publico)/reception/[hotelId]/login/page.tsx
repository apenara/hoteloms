'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PinLogin } from '@/components/staff/PinLogin';
import StaffLoginDialog from '@/components/staff/StaffLoginDialog';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';

export default function ReceptionLoginPage() {
  const router = useRouter();
  const params = useParams();
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [error, setError] = useState('');

  const handleStaffAccess = (staffMember) => {
    // Verificar que sea personal de recepción
    if (staffMember.role !== 'reception') {
      setError('Acceso no autorizado - Solo personal de recepción');
      return;
    }

    // Guardar información de acceso
    const staffAccess = {
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      hotelId: params.hotelId,
      accessType: 'pin',
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('staffAccess', JSON.stringify(staffAccess));
    sessionStorage.setItem('currentStaffSession', JSON.stringify({
      ...staffAccess,
      sessionStart: new Date().toISOString()
    }));

    // Redirigir al dashboard de recepción
    router.push(`/reception/${params.hotelId}/staff`);
  };

  const handleLoginSuccess = (user) => {
    if (user.role !== 'reception') {
      setError('Acceso no autorizado - Solo personal de recepción');
      return;
    }
    router.push(`/reception/${params.hotelId}/staff`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Acceso Recepción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setShowPinLogin(true)}
            >
              Acceso con PIN
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowStaffLogin(true)}
            >
              Acceso con Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs de Login */}
      <PinLogin
        isOpen={showPinLogin}
        onClose={() => setShowPinLogin(false)}
        onSuccess={handleStaffAccess}
        hotelId={params.hotelId}
        requiredRole="reception"
      />

      <StaffLoginDialog
        isOpen={showStaffLogin}
        onClose={() => setShowStaffLogin(false)}
        onSuccess={handleLoginSuccess}
        hotelId={params.hotelId}
        requiredRole="reception"
      />
    </div>
  );
}