"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const QRLogin = ({ onLogin }) => {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('waiting');

  useEffect(() => {
    // Generar un ID de sesión único
    const newSessionId = Math.random().toString(36).substring(2, 15);
    setSessionId(newSessionId);

    // Escuchar cambios en el documento de la sesión
    const sessionRef = doc(db, 'qr_sessions', newSessionId);
    const unsubscribe = onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === 'authenticated') {
          onLogin(data.userData);
        } else if (data.status === 'error') {
          setError(data.error || 'Error de autenticación');
        }
        setStatus(data.status);
      }
    });

    return () => unsubscribe();
  }, [onLogin]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Iniciar Sesión</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="p-4 bg-white rounded-lg">
          <QRCodeSVG
            value={`${window.location.origin}/auth/qr/${sessionId}`}
            size={256}
            level="H"
          />
        </div>

        <p className="mt-4 text-center text-gray-600">
          {status === 'waiting' && 'Escanea el código QR con la app móvil para iniciar sesión'}
          {status === 'scanning' && 'Código QR escaneado, autenticando...'}
        </p>
      </CardContent>
    </Card>
  );
};

export default QRLogin;